import {
  ActivityType,
  SlashCommandBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
} from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

import { misc, hybridReply, gameIcons } from "#helpers";
import Manager from "#managers";

const { drawRoundedRect } = misc;
const { assetCoverUrls, fallbackCoverUrls } = gameIcons;


async function firstLoadable(urls) {
  for (const url of urls ?? []) {
    if (!url) continue;
    const image = await loadImage(url).catch(() => null);
    if (image) return image;
  }
  return null;
}

const CARD_W = 720;
const CARD_H = 250;

const COLORS = {
  bg: "#0f1117",
  gradient: ["rgba(20,22,30,0.72)", "rgba(5,6,10,0.90)"],
  coverFallback: "#1e2230",
  border: "rgba(255,255,255,0.10)",
  title: "#ffffff",
  sub: "#c7cbd8",
  muted: "#8b90a0",
  pillBg: "rgba(88,101,242,0.20)",
  pillStroke: "rgba(88,101,242,0.55)",
  pillText: "#a5b4fc",
  badgeBg: "rgba(255,255,255,0.07)",
  badgeStroke: "rgba(255,255,255,0.12)",
  badgeText: "#e1e1e1",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}


function fmtDate(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function fmtDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;

  return `${m}:${pad2(s)}`;
}

function truncate(value, max) {
  const s = String(value ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}


function findPlayingActivity(source) {
  const activities = source?.presence?.activities;
  if (!Array.isArray(activities) || !activities.length) return null;
  for (const a of activities) {
    const type = typeof a.type === "number" ? a.type : Number(a.type);
    if (type !== ActivityType.Playing) continue;
    if (!a.name) continue;
    return a;
  }
  return null;
}

function displayNameOf(owner, fallback) {
  return (
    owner?.user?.displayName ||
    owner?.displayName ||
    owner?.globalName ||
    owner?.user?.username ||
    owner?.username ||
    fallback
  );
}


async function locateActivity(client, ctx, targetId) {
  const direct = [];
  if (ctx.member?.id === targetId) direct.push(ctx.member);
  if (ctx.author?.id === targetId) direct.push(ctx.author);
  if (ctx.user?.id === targetId) direct.push(ctx.user);
  const cachedUser = client.users?.cache?.get?.(targetId);
  if (cachedUser) direct.push(cachedUser);

  for (const source of direct) {
    const activity = findPlayingActivity(source);
    if (activity) return { activity, owner: source, foundInGuild: false };
  }

  const guilds = Array.from(client.guilds?.cache?.values?.() ?? []);
  let foundInGuild = false;

  for (const guild of guilds) {
    const member = guild.members?.cache?.get(targetId);
    if (!member) continue;
    foundInGuild = true;
    const activity = findPlayingActivity(member);
    if (activity) return { activity, owner: member, foundInGuild };
  }

  for (const guild of guilds) {
    const member = await guild.members
      .fetch({ user: targetId, force: true })
      .catch(() => null);
    if (!member) continue;
    foundInGuild = true;
    const activity = findPlayingActivity(member);
    if (activity) return { activity, owner: member, foundInGuild };
  }

  for (const guild of guilds) {
    const all = await guild.members
      .fetch({ withPresences: true, force: true })
      .catch(() => null);
    const member = all?.get?.(targetId);
    if (!member) continue;
    foundInGuild = true;
    const activity = findPlayingActivity(member);
    if (activity) return { activity, owner: member, foundInGuild };
  }

  return { activity: null, owner: cachedUser ?? null, foundInGuild };
}

function drawPlaceholderCover(c, x, y, size, radius, label) {
  drawRoundedRect(c, x, y, size, size, radius, COLORS.coverFallback, null, 1);
  const letter = (String(label ?? "?").trim()[0] || "?").toLocaleUpperCase("tr-TR");
  c.save();
  c.fillStyle = COLORS.badgeText;
  c.font = "bold 90px sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(letter, x + size / 2, y + size / 2 + 4);
  c.restore();
}

async function renderGameCard({ activity, ownerName, cover, small }) {
  const canvas = createCanvas(CARD_W, CARD_H);
  const c = canvas.getContext("2d");


  c.save();
  c.beginPath();
  c.roundRect(0, 0, CARD_W, CARD_H, 28);
  c.clip();
  if (cover) {
    c.filter = "blur(35px) brightness(0.42)";
    c.drawImage(cover, -50, -50, CARD_W + 100, CARD_H + 100);
    c.filter = "none";
  } else {
    c.fillStyle = COLORS.bg;
    c.fillRect(0, 0, CARD_W, CARD_H);
  }
  const grad = c.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, COLORS.gradient[0]);
  grad.addColorStop(1, COLORS.gradient[1]);
  c.fillStyle = grad;
  c.fillRect(0, 0, CARD_W, CARD_H);
  c.restore();

  drawRoundedRect(c, 0.75, 0.75, CARD_W - 1.5, CARD_H - 1.5, 28, null, COLORS.border, 1.5);


  const ix = 25;
  const iy = 25;
  const isz = 200;
  if (cover) {
    c.save();
    c.beginPath();
    c.roundRect(ix, iy, isz, isz, 40);
    c.fillStyle = COLORS.coverFallback;
    c.fill();
    c.clip();
    c.drawImage(cover, ix, iy, isz, isz);
    c.restore();
  } else {
    drawPlaceholderCover(c, ix, iy, isz, 40, activity.name);
  }

  if (small) {
    const sr = 72;
    const cx = ix + isz - sr / 2 - 8;
    const cy = iy + isz - sr / 2 - 8;
    c.save();
    c.beginPath();
    c.arc(cx, cy, sr / 2, 0, Math.PI * 2);
    c.closePath();
    c.fillStyle = "#0b0d13";
    c.fill();
    c.clip();
    c.drawImage(small, cx - sr / 2, cy - sr / 2, sr, sr);
    c.restore();
    c.beginPath();
    c.arc(cx, cy, sr / 2, 0, Math.PI * 2);
    c.strokeStyle = "rgba(255,255,255,0.35)";
    c.lineWidth = 3;
    c.stroke();
  }

  const badgeText = `Oynayan: ${truncate(ownerName, 22)}`;
  c.font = "12px sans-serif";
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  const badgeW = c.measureText(badgeText).width + 24;
  const badgeX = CARD_W - badgeW - 25;
  drawRoundedRect(c, badgeX, 28, badgeW, 28, 12, COLORS.badgeBg, COLORS.badgeStroke, 1);
  c.fillStyle = COLORS.badgeText;
  c.fillText(badgeText, badgeX + 12, 46);

  const tx = 250;

  c.font = "bold 26px sans-serif";
  c.fillStyle = COLORS.title;
  c.fillText(truncate(activity.name, 30), tx, 90);

  let lineY = 116;
  const detail = activity.details || activity.assets?.largeText;
  if (detail) {
    c.font = "bold 15px sans-serif";
    c.fillStyle = COLORS.sub;
    c.fillText(truncate(detail, 42), tx, lineY);
    lineY += 22;
  }
  if (activity.state) {
    c.font = "13px sans-serif";
    c.fillStyle = COLORS.muted;
    c.fillText(truncate(activity.state, 48), tx, lineY);
  }

  const startDate = activity.timestamps?.start ? new Date(activity.timestamps.start) : null;
  const playMs = startDate ? Date.now() - startDate.getTime() : null;
  const duration = fmtDuration(playMs);
  const pillText = duration ? `${duration}` : "00:00";
  c.font = "bold 15px sans-serif";
  const pillW = c.measureText(pillText).width + 34;
  drawRoundedRect(c, tx, 152, pillW, 38, 12, COLORS.pillBg, COLORS.pillStroke, 1);
  c.fillStyle = COLORS.pillText;
  c.fillText(pillText, tx + 17, 177);

  const meta = [];
  const startStr = fmtDate(startDate);
  if (startStr) meta.push(`Başlangıç: ${startStr}`);
  const party = activity.party?.size;
  if (party?.current) meta.push(`Oyuncu: ${party.current}${party.max ? `/${party.max}` : ""}`);
  if (activity.assets?.smallText) meta.push(truncate(activity.assets.smallText, 26));
  c.font = "12px sans-serif";
  c.fillStyle = COLORS.muted;
  c.fillText(truncate(meta.join("   •   "), 62), tx, 216);

  return canvas.encode("png");
}

export default {
  name: "game",
  description: "Şu an oynanan oyunu kart olarak gösterir.",
  aliases: ["oyun", "oynadığım", "oyunum", "playing"],
  permissions: { enabled: false },
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("game")
    .setDescription("Şu an oynadığın oyunu kart olarak gösterir.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Kullanıcı (boş = kendin)").setRequired(false)
    )
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
      InteractionContextType.Guild,
    ]),

  async execute(client, ctx, options) {
    try {
      const manager = new Manager(client, { action: ctx });
      const selfId = ctx.user?.id ?? ctx.author?.id ?? ctx.member?.id ?? null;
      const isPrefix = typeof ctx.content === "string";

      let targetId = null;
      const rawUser = options?.user;
      if (rawUser?.id) targetId = rawUser.id;
      else if (rawUser?.user?.id) targetId = rawUser.user.id;

      if (!targetId && isPrefix) {
        const token = (options?._raw ?? [])[0];
        if (token) {
          const match = String(token).match(/\d{17,20}/);
          if (match) targetId = match[0];
        }
        if (!targetId && ctx.mentions?.users?.size) {
          const mentioned = ctx.mentions.users.first();
          if (mentioned) targetId = mentioned.id;
        }
      }

      if (!targetId) targetId = selfId;
      if (!targetId) {
        return manager.sender.reply(manager.sender.errorEmbed("Kullanıcı bulunamadı."));
      }

      const targetIsSelf = !!selfId && targetId === selfId;
      const { activity, owner, foundInGuild } = await locateActivity(client, ctx, targetId);

      if (!activity) {
        let msg =
          "🎮 Bu kullanıcı şu anda bir oyun oynamıyor. (Discord'da oyun etkinliği paylaşımının açık olması gerekir.)";
        if (!targetIsSelf) {
          if (client.guilds?.cache?.size && !foundInGuild) {
            msg =
              "⚠️ **Bu kullanıcı ile ortak sunucum yok.** Oyun etkinliğini görebilmem için kullanıcının botun bulunduğu EN AZ BİR sunucuda üye olması gerekir. Aksi halde Discord aktivite verisini paylaşmaz.";
          } else if (foundInGuild) {
            msg =
              "🎮 Ortak sunucuda üyesi bulundu ama şu an oyun etkinliği görünmüyor. (Kullanıcı çevrimdışı/gizli olabilir ya da Discord etkinliği henüz yaymamış olabilir.)";
          }
        }
        return manager.sender.reply(manager.sender.errorEmbed(msg));
      }

      const fallbackName =
        ctx.member?.displayName ?? ctx.author?.username ?? ctx.user?.username ?? "Kullanıcı";
      const ownerName = displayNameOf(owner, fallbackName);

      let cover = await firstLoadable(assetCoverUrls(activity));
      if (!cover) {
        const fallbacks = await fallbackCoverUrls(client, activity).catch(() => []);
        cover = await firstLoadable(fallbacks);
      }

      const small = await firstLoadable([
        activity.assets?.smallImageURL?.({ size: 512, extension: "png" }),
        activity.applicationId && activity.assets?.smallImage && !activity.assets.smallImage.includes(":")
          ? `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.smallImage}.png?size=512`
          : null,
      ]);

      const buffer = await renderGameCard({ activity, ownerName, cover, small });

      return hybridReply(ctx, {
        files: [{ name: "game-card.png", attachment: buffer }],
      });
    } catch (err) {
      console.error("[game hybrid error]", err);
    }
  },
};
