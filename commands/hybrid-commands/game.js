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
  border: "rgba(255,255,255,0.10)",
  title: "#ffffff",
  sub: "#c7cbd8",
  muted: "#8b90a0",
  badgeText: "#e1e1e1",
};

function accentFromImage(image) {
  if (!image) return { r: 29, g: 185, b: 84 };
  try {
    const probe = createCanvas(24, 24);
    const pc = probe.getContext("2d");
    pc.drawImage(image, 0, 0, 24, 24);
    const { data } = pc.getImageData(0, 0, 24, 24);

    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    r /= count;
    g /= count;
    b /= count;

    const avg = (r + g + b) / 3;
    const boost = (v) => Math.max(0, Math.min(255, Math.round(avg + (v - avg) * 1.7 + 14)));
    r = boost(r);
    g = boost(g);
    b = boost(b);

    const max = Math.max(r, g, b);
    if (max < 150) {
      const k = 150 / Math.max(1, max);
      r = Math.min(255, Math.round(r * k));
      g = Math.min(255, Math.round(g * k));
      b = Math.min(255, Math.round(b * k));
    }

    return { r, g, b };
  } catch {
    return { r: 29, g: 185, b: 84 };
  }
}

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
  drawRoundedRect(c, x, y, size, size, radius, "rgba(255,255,255,0.05)", null, 1);
  const letter = (String(label ?? "?").trim()[0] || "?").toLocaleUpperCase("tr-TR");
  c.save();
  c.fillStyle = COLORS.badgeText;
  c.font = "bold 78px sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(letter, x + size / 2, y + size / 2 + 4);
  c.restore();
}

async function renderGameCard({ activity, ownerName, cover, small }) {
  const canvas = createCanvas(CARD_W, CARD_H);
  const c = canvas.getContext("2d");

  const accent = accentFromImage(cover);
  const accentStr = `${accent.r}, ${accent.g}, ${accent.b}`;

  // --- Arka plan: bulanık kapak + aksan rengi tonlaması (Spotify hissi) ---
  c.save();
  c.beginPath();
  c.roundRect(0, 0, CARD_W, CARD_H, 28);
  c.clip();

  if (cover) {
    c.filter = "blur(48px) brightness(0.42) saturate(1.25)";
    c.drawImage(cover, -70, -70, CARD_W + 140, CARD_H + 140);
    c.filter = "none";
  } else {
    c.fillStyle = COLORS.bg;
    c.fillRect(0, 0, CARD_W, CARD_H);
  }

  const shade = c.createLinearGradient(0, 0, CARD_W * 0.85, CARD_H);
  shade.addColorStop(0, "rgba(8,10,14,0.35)");
  shade.addColorStop(1, "rgba(4,5,8,0.92)");
  c.fillStyle = shade;
  c.fillRect(0, 0, CARD_W, CARD_H);

  const tint = c.createLinearGradient(0, 0, CARD_W * 0.75, CARD_H);
  tint.addColorStop(0, `rgba(${accentStr}, 0.42)`);
  tint.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = tint;
  c.fillRect(0, 0, CARD_W, CARD_H);

  const sheen = c.createLinearGradient(0, 0, 0, CARD_H);
  sheen.addColorStop(0, "rgba(255,255,255,0.10)");
  sheen.addColorStop(0.35, "rgba(255,255,255,0)");
  c.fillStyle = sheen;
  c.fillRect(0, 0, CARD_W, CARD_H);
  c.restore();

  drawRoundedRect(c, 0.75, 0.75, CARD_W - 1.5, CARD_H - 1.5, 28, null, COLORS.border, 1.5);

  // --- Kapak görseli (albüm kapağı gibi) ---
  const ix = 28;
  const isz = 168;
  const iy = (CARD_H - isz) / 2;

  c.save();
  c.shadowColor = "rgba(0,0,0,0.55)";
  c.shadowBlur = 26;
  c.shadowOffsetY = 8;
  drawRoundedRect(c, ix, iy, isz, isz, 18, "rgba(0,0,0,0.02)", null, 0);
  c.restore();

  if (cover) {
    c.save();
    c.beginPath();
    c.roundRect(ix, iy, isz, isz, 18);
    c.clip();
    c.drawImage(cover, ix, iy, isz, isz);
    c.restore();
  } else {
    drawPlaceholderCover(c, ix, iy, isz, 18, activity.name);
  }

  drawRoundedRect(c, ix + 0.75, iy + 0.75, isz - 1.5, isz - 1.5, 18, null, "rgba(255,255,255,0.14)", 1.5);

  // Kapak üzerindeki küçük görsel (oyun içi durum) — aksan halkası ile
  if (small) {
    const sr = 54;
    const cx = ix + isz - sr / 2 - 2;
    const cy = iy + isz - sr / 2 - 2;
    c.save();
    c.beginPath();
    c.arc(cx, cy, sr / 2 + 3, 0, Math.PI * 2);
    c.fillStyle = `rgb(${accentStr})`;
    c.fill();
    c.beginPath();
    c.arc(cx, cy, sr / 2, 0, Math.PI * 2);
    c.clip();
    c.drawImage(small, cx - sr / 2, cy - sr / 2, sr, sr);
    c.restore();
  }

  // --- Sağ taraf: metinler ---
  const tx = 224;
  const right = CARD_W - 28;

  // Oynayan kişi rozeti (sağ üst)
  const badgeText = `Oynayan: ${truncate(ownerName, 20)}`;
  c.font = "12px sans-serif";
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  const badgeW = c.measureText(badgeText).width + 26;
  drawRoundedRect(c, right - badgeW, 22, badgeW, 28, 14, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.14)", 1);
  c.fillStyle = COLORS.badgeText;
  c.fillText(badgeText, right - badgeW + 13, 40);

  // Oyun adı
  c.font = "bold 30px sans-serif";
  c.fillStyle = COLORS.title;
  c.fillText(truncate(activity.name, 26), tx, 90);

  // Detay / durum satırları
  const detail = activity.details || activity.assets?.largeText || activity.state;
  if (detail) {
    c.font = "bold 15px sans-serif";
    c.fillStyle = COLORS.sub;
    c.fillText(truncate(detail, 46), tx, 116);
  }

  const state = activity.details && activity.state ? activity.state : null;
  if (state) {
    c.font = "13px sans-serif";
    c.fillStyle = COLORS.muted;
    c.fillText(truncate(state, 54), tx, 137);
  }

  // --- Oynanma süresi çubuğu ---
  const startDate = activity.timestamps?.start ? new Date(activity.timestamps.start) : null;
  const playMs = startDate ? Date.now() - startDate.getTime() : null;
  const duration = fmtDuration(playMs);

  const barY = 176;
  const barW = right - tx;
  // Son 60 saniyenin ilerleyişi: süre her çağrıda canlı görünsün
  const progress = playMs != null ? (Math.floor(playMs / 1000) % 60) / 60 : 0;

  drawRoundedRect(c, tx, barY, barW, 5, 2.5, "rgba(255,255,255,0.18)", null, 0);
  drawRoundedRect(c, tx, barY, Math.max(6, barW * progress), 5, 2.5, `rgb(${accentStr})`, null, 0);

  const knobX = tx + Math.max(6, barW * progress);
  c.save();
  c.beginPath();
  c.arc(knobX, barY + 2.5, 6, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.shadowColor = `rgba(${accentStr}, 0.9)`;
  c.shadowBlur = 12;
  c.fill();
  c.restore();

  const startStr = fmtDate(startDate);
  c.font = "12px sans-serif";
  c.fillStyle = COLORS.muted;
  c.fillText(startStr ? `Başlangıç: ${startStr}` : "Şu an oynuyor", tx, barY + 22);

  c.font = "bold 12px sans-serif";
  c.fillStyle = duration ? COLORS.sub : COLORS.muted;
  c.textAlign = "right";
  c.fillText(duration ?? "00:00", right, barY + 22);

  // --- Alt bilgi satırı ---
  const meta = [];
  const party = activity.party?.size;
  if (party?.current) meta.push(`Oyuncu ${party.current}${party.max ? `/${party.max}` : ""}`);
  if (activity.assets?.smallText) meta.push(truncate(activity.assets.smallText, 28));
  meta.push(activity.type === ActivityType.Playing ? "Oynuyor" : "Etkinlik");

  c.font = "12px sans-serif";
  c.fillStyle = COLORS.muted;
  c.textAlign = "left";
  c.fillText(truncate(meta.join("   •   "), 62), tx, 226);

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
