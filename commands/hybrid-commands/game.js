import {
  ActivityType,
  SlashCommandBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
} from "discord.js";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { hybridReply, gameIcons } from "#helpers";
import Manager from "#managers";

const { assetCoverUrls, fallbackCoverUrls } = gameIcons;


const OUTPUT_WIDTH = 1380;
const OUTPUT_HEIGHT = 610;

const CARD_LEFT = 71;
const CARD_TOP = 60;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const IMAGE_DOMAINS = [
  "discordapp.com", "discordapp.net", "discord.com", "discordcdn.com",
  "steamstatic.com", "steampowered.com", "steamcdn-a.akamaihd.net",
  "igdb.com", "epicgames.com", "githubusercontent.com", "raw.githubusercontent.com",
  "jtvnw.net", "cloudinary.com", "xboxlive.com", "riotgames.com",
  "steamgriddb.com", "rawg.io", "xboxservices.com", "unrealengine.com",
];

let sharedBrowserPromise = null;
async function getBrowser() {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = puppeteer.launch({
      headless: true,
      ...(process.env.PUPPETEER_EXECUTABLE_PATH
        ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
        : {}),
      args: [
        "--disable-dev-shm-usage",
        ...(process.env.PUPPETEER_NO_SANDBOX === "1"
          ? ["--no-sandbox", "--disable-setuid-sandbox"]
          : []),
      ],
    }).catch((error) => {
      sharedBrowserPromise = null;
      throw error;
    });
  }
  const browser = await sharedBrowserPromise;
  if (!browser.connected) {
    sharedBrowserPromise = null;
    return getBrowser();
  }
  return browser;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function durationParts(startDate) {
  if (!startDate || !Number.isFinite(startDate.getTime())) return null;
  const delta = Date.now() - startDate.getTime();
  if (delta < 0) return null;
  const minutes = Math.floor(delta / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days} gün ${hours} sa`;
  if (hours) return `${hours} sa ${mins} dk`;
  return `${Math.max(0, mins)} dk`;
}

function findPlayingActivity(source) {
  return source?.presence?.activities?.find(
    (activity) => Number(activity.type) === ActivityType.Playing && activity.name
  ) ?? null;
}

function displayNameOf(owner, fallback) {
  return owner?.displayName || owner?.user?.displayName || owner?.globalName ||
    owner?.user?.globalName || owner?.user?.username || owner?.username || fallback;
}

async function locateActivity(client, ctx, targetId) {
  const candidates = [];
  if (ctx.member?.id === targetId) candidates.push(ctx.member);
  if (ctx.author?.id === targetId) candidates.push(ctx.author);
  if (ctx.user?.id === targetId) candidates.push(ctx.user);
  const user = client.users?.cache?.get(targetId);
  if (user) candidates.push(user);

  for (const source of candidates) {
    const activity = findPlayingActivity(source);
    if (activity) return { activity, owner: source, foundInGuild: false };
  }

  const guilds = Array.from(client.guilds?.cache?.values() ?? []);
  let foundInGuild = false;
  for (const guild of guilds) {
    const member = guild.members?.cache?.get(targetId);
    if (!member) continue;
    foundInGuild = true;
    const activity = findPlayingActivity(member);
    if (activity) return { activity, owner: member, foundInGuild };
  }
  for (const guild of guilds) {
    const member = await guild.members.fetch({ user: targetId, force: true }).catch(() => null);
    if (!member) continue;
    foundInGuild = true;
    const activity = findPlayingActivity(member);
    if (activity) return { activity, owner: member, foundInGuild };
  }
  for (const guild of guilds) {
    const members = await guild.members.fetch({ withPresences: true, force: true }).catch(() => null);
    const member = members?.get?.(targetId);
    if (!member) continue;
    foundInGuild = true;
    const activity = findPlayingActivity(member);
    if (activity) return { activity, owner: member, foundInGuild };
  }
  return { activity: null, owner: user ?? null, foundInGuild };
}

function isAllowedImageURL(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    return IMAGE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

async function imageAsDataURI(rawURL, redirects = 0) {
  if (!rawURL || !isAllowedImageURL(rawURL)) return null;
  try {
    const response = await fetch(rawURL, {
      signal: AbortSignal.timeout(6500),
      redirect: "manual",
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.5" },
    });
    if (response.status >= 300 && response.status < 400 && redirects < 3) {
      const location = response.headers.get("location");
      if (!location) return null;
      return imageAsDataURI(new URL(location, rawURL).href, redirects + 1);
    }
    if (!response.ok) return null;
    const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    const supported = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!supported.includes(type)) return null;
    if (Number(response.headers.get("content-length") || 0) > MAX_IMAGE_BYTES) return null;
    if (!response.body) return null;
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    return `data:${type};base64,${Buffer.concat(chunks).toString("base64")}`;
  } catch {
    return null;
  }
}

async function firstImage(urls) {
  for (const url of urls ?? []) {
    const data = await imageAsDataURI(url);
    if (data) return data;
  }
  return null;
}


async function extractGlowPalette(coverData) {
  const fallback = {
    left: [113, 100, 155],
    right: [90, 124, 178],
    center: [101, 112, 167],
  };
  if (!coverData) return fallback;

  try {
    const encoded = coverData.slice(coverData.indexOf(",") + 1);
    const { data, info } = await sharp(Buffer.from(encoded, "base64"))
      .resize(72, 72, { fit: "cover", position: "centre" })
      .removeAlpha()
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });

    const buckets = Array.from({ length: 3 }, () =>
      Array.from({ length: 24 }, () => ({ weight: 0, r: 0, g: 0, b: 0 })),
    );

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const chroma = max - min;
        const saturation = max > 0 ? chroma / max : 0;
        if (max < 0.14 || saturation < 0.20) continue;

        let hue;
        if (r >= g && r >= b) hue = ((g - b) / 255) / chroma;
        else if (g >= r && g >= b) hue = ((b - r) / 255) / chroma + 2;
        else hue = ((r - g) / 255) / chroma + 4;
        hue = ((hue * 60) % 360 + 360) % 360;

        const slot = Math.min(23, Math.floor(hue / 15));
        const weight = Math.pow(saturation, 1.65) * Math.sqrt(max) * (0.75 + chroma);
        const region = x < info.width / 2 ? 0 : 1;
        for (const p of [region, 2]) {
          const item = buckets[p][slot];
          item.weight += weight;
          item.r += r * weight;
          item.g += g * weight;
          item.b += b * weight;
        }
      }
    }

    const hsvColor = (entry) => {
      if (!entry || !entry.weight) return null;
      let r = entry.r / entry.weight;
      let g = entry.g / entry.weight;
      let b = entry.b / entry.weight;
      const avg = (r + g + b) / 3;
      // Siyah kapaklarda glow görünür kalsın ama neon patlamasın.
      const strongest = Math.max(r, g, b);
      const scale = Math.min(1.7, 170 / Math.max(1, strongest));
      return [r, g, b].map(v =>
        Math.max(0, Math.min(255, Math.round((avg + (v - avg) * 1.18) * scale))),
      );
    };

    const ordered = (bucket) => bucket
      .map((entry, index) => ({ ...entry, index }))
      .sort((a, b) => b.weight - a.weight);
    const leftOptions = ordered(buckets[0]);
    const rightOptions = ordered(buckets[1]);
    const overallOptions = ordered(buckets[2]);
    let leftEntry = leftOptions[0];
    let rightEntry = rightOptions[0];
    const separation = (a, b) => {
      const diff = Math.abs(a.index - b.index);
      return Math.min(diff, 24 - diff);
    };

    if (leftEntry?.weight && rightEntry?.weight && separation(leftEntry, rightEntry) < 3) {
      const second = [...rightOptions.slice(0, 12), ...overallOptions.slice(0, 12)]
        .filter(entry => entry.weight > 0 && separation(entry, leftEntry) >= 3)
        .sort((a, b) => b.weight - a.weight)[0];
      if (second && second.weight >= overallOptions[0].weight * 0.09) rightEntry = second;
    }

    const left = hsvColor(leftEntry) ?? fallback.left;
    const right = hsvColor(rightEntry) ?? fallback.right;
    const center = left.map((v, i) => Math.round(v * 0.48 + right[i] * 0.52));
    return { left, right, center };
  } catch (error) {
    console.warn("[game card palette] Kapak renkleri okunamadı:", error?.message);
    return fallback;
  }
}

function buildGameCardHTML({ gameName, ownerName, coverData, avatarData, duration, started, palette }) {
  const leftGlow = palette.left.join(", ");
  const rightGlow = palette.right.join(", ");
  const centerGlow = palette.center.join(", ");
  const safeGame = escapeHTML(gameName);
  const safeName = escapeHTML(ownerName);
  const firstLetter = escapeHTML(String(ownerName || "?").trim().charAt(0).toLocaleUpperCase("tr-TR"));
  const cover = coverData
    ? `<img class="cover-image" src="${coverData}" alt="Oyun kapağı" />`
    : `<span class="cover-initial">${escapeHTML(String(gameName || "?")[0]?.toLocaleUpperCase("tr-TR"))}</span>`;
  const avatar = avatarData
    ? `<img class="avatar-image" src="${avatarData}" alt="" />`
    : `<span class="avatar-fallback">${firstLetter}</span>`;

  const nameLength = Array.from(String(gameName ?? "")).length;
  const titleSize = nameLength > 27 ? 45 : nameLength > 21 ? 54 : nameLength > 15 ? 65 : 80;
  const durationSize = String(duration ?? "").length > 11 ? 28 : 35;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root {
    color-scheme: dark;
    --glow-left: ${leftGlow};
    --glow-right: ${rightGlow};
    --glow-mid: ${centerGlow};
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; width: ${OUTPUT_WIDTH}px; height: ${OUTPUT_HEIGHT}px; overflow: hidden; background: transparent !important; }
  body { font-family: "Inter Display", Inter, Arial, sans-serif; background: transparent; -webkit-font-smoothing: antialiased; }
  /* Görünmez sahne: Kart dışı tamamen şeffaf. */
  .scene { position:relative;width:${OUTPUT_WIDTH}px;height:${OUTPUT_HEIGHT}px;overflow:hidden;background:transparent; }
  .halo { position:absolute;left:${CARD_LEFT - 3}px;top:${CARD_TOP - 1}px;width:1244px;height:492px;border-radius:47px;
    background:linear-gradient(100deg,rgba(var(--glow-left),.91) 0%,rgba(var(--glow-mid),.12) 44%,rgba(var(--glow-mid),.18) 67%,rgba(var(--glow-right),.88) 100%);
    filter:blur(27px);opacity:.32; }
  .card { position:absolute; left:${CARD_LEFT}px;top:${CARD_TOP}px;width:1238px;height:490px;isolation:isolate;
    border-radius:46px; overflow:hidden;
    background:
      radial-gradient(ellipse 460px 420px at 9% 14%,rgba(var(--glow-left),.16),transparent 78%),
      radial-gradient(ellipse 460px 460px at 101% 78%,rgba(var(--glow-right),.14),transparent 74%),
      radial-gradient(ellipse 430px 420px at 78% 16%,rgba(var(--glow-mid),.13),transparent 82%),
      linear-gradient(116deg,#161522 1%,#10131e 45%,#0e1423 100%);
    box-shadow: 0 34px 80px rgba(0,0,0,.36);
  }
  .card::before { content:""; position:absolute; inset:0; z-index:5;pointer-events:none;
    padding:2px;border-radius:46px;
    background:linear-gradient(107deg,
      rgba(var(--glow-left),.98) 0%,rgba(var(--glow-left),.78) 8%,
      rgba(var(--glow-mid),.21) 39%,rgba(var(--glow-mid),.27) 59%,
      rgba(var(--glow-right),.94) 91%,rgba(var(--glow-right),1) 100%);
    -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;
  }
  .card::after { content:""; position:absolute;inset:2px;z-index:-1;pointer-events:none;
    background:radial-gradient(ellipse at 65% 8%,rgba(255,255,255,.025),transparent 65%);}
  .left-bloom,.right-bloom {position:absolute;pointer-events:none;z-index:1;opacity:.55;filter:blur(16px)}
  .left-bloom {left:-43px;bottom:-46px;width:220px;height:270px;background:radial-gradient(ellipse,rgba(var(--glow-left),.32),transparent 67%);}
  .right-bloom {right:-55px;bottom:-50px;width:230px;height:270px;background:radial-gradient(ellipse,rgba(var(--glow-right),.35),transparent 70%);}
  .cover-wrap {position:absolute;z-index:2;left:40px;top:30px;width:440px;height:434px;border-radius:42px;overflow:hidden;
    background:linear-gradient(140deg,#141724,#1b2030);
    box-shadow:0 12px 35px rgba(1,3,15,.45),0 0 0 1.5px rgba(var(--glow-mid),.58);
    display:flex;align-items:center;justify-content:center;}
  .cover-image {width:100%;height:100%;object-fit:cover;display:block;}
  .cover-initial {font-size:140px;font-weight:800;color:rgba(255,255,255,.82)}
  .right {position:absolute;z-index:3;left:550px;top:0;right:50px;height:100%;}
  .status {position:absolute;left:0;top:80px;display:flex;align-items:center;gap:17px;height:36px;
    font-size:24px;font-weight:450;letter-spacing:2px;color:#9da5be;white-space:nowrap;}
  .status-dot {display:block;width:20px;height:20px;flex:0 0 20px;border-radius:50%;background:#00e7a1;
    box-shadow:0 0 17px rgba(0,228,163,.27);}
  .game-name {position:absolute;left:0;right:0;top:137px;margin:0;font-size:${titleSize}px;line-height:1.12;
    font-weight:700;letter-spacing:-2.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    color:#f6f7ff;text-shadow:0 1px 8px rgba(186,203,255,.1);}
  .owner {position:absolute;left:0;top:246px;height:81px;max-width:550px;min-width:221px;
    border-radius:42px;display:inline-flex;align-items:center;gap:26px;
    padding:9px 28px 9px 10px;background:linear-gradient(110deg,rgba(90,99,145,.18),rgba(93,104,141,.12));
    box-shadow:inset 0 0 0 1px rgba(177,189,237,.09),0 7px 24px rgba(0,0,0,.08);}
  .avatar {position:relative;flex:0 0 63px;width:63px;height:63px;overflow:hidden;border-radius:50%;
    background:linear-gradient(145deg,rgba(var(--glow-left),.82),rgba(var(--glow-right),.82));display:flex;align-items:center;justify-content:center;}
  .avatar-image {width:100%;height:100%;display:block;object-fit:cover;}
  .avatar-fallback {font-weight:750;font-size:32px;color:#f6e8ff;}
  .owner-name {min-width:0;font-size:32px;line-height:1;font-weight:520;color:#f2f3fa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .meta {position:absolute;left:0;top:363px;height:55px;width:100%;display:flex;align-items:center;white-space:nowrap;}
  .clock {width:43px;height:43px;flex:0 0 43px;stroke:#c7d2e9;stroke-width:2.5;fill:none;}
  .elapsed {position:absolute;left:68px;top:5px;height:50px;display:flex;align-items:center;gap:8px;overflow:hidden;max-width:279px;}
  .elapsed strong {font-size:${durationSize}px;font-weight:650;letter-spacing:-1px;color:#f5f6fc;line-height:1;}
  .elapsed span {font-size:25px;font-weight:400;color:#8e98b1;line-height:1;}
  .meta-divider {position:absolute;left:350px;top:0;width:1.5px;height:49px;background:rgba(158,167,200,.23);}
  .started {position:absolute;left:397px;top:8px;font-size:28px;font-weight:420;color:#8f9bb5;line-height:42px;}
</style>
</head>
<body>
<div class="scene">
  <div class="halo"></div>
  <article class="card" role="img" aria-label="${safeGame}, ${safeName} tarafından oynanıyor">
    <div class="left-bloom"></div><div class="right-bloom"></div>
    <div class="cover-wrap">${cover}</div>
    <section class="right">
      <div class="status"><span class="status-dot"></span><span>ŞU AN OYNUYOR</span></div>
      <h1 class="game-name">${safeGame}</h1>
      <div class="owner"><div class="avatar">${avatar}</div><div class="owner-name">${safeName}</div></div>
      <div class="meta">
        <svg class="clock" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M22 11.5v11l8 5"/></svg>
        <div class="elapsed"><strong>${escapeHTML(duration ?? "—")}</strong><span>oynandı</span></div>
        <div class="meta-divider"></div>
        <span class="started">Başlangıç ${escapeHTML(started ?? "—")}</span>
      </div>
    </section>
  </article>
</div>
</body></html>`;
}

async function renderGameCard(args) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT, deviceScaleFactor: 1 });
    await page.setContent(buildGameCardHTML(args), { waitUntil: "load", timeout: 15000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (img) => img.decode().catch(() => {})));
    });
    return await page.screenshot({ type: "png", fullPage: false, animations: "disabled", omitBackground: true });
  } finally {
    await page.close();
  }
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
    .addUserOption((opt) => opt.setName("user").setDescription("Kullanıcı (boş = kendin)").setRequired(false))
    .setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
    .setContexts([InteractionContextType.BotDM, InteractionContextType.PrivateChannel, InteractionContextType.Guild]),

  async execute(client, ctx, options) {
    const manager = new Manager(client, { action: ctx });
    try {
      const selfId = ctx.user?.id ?? ctx.author?.id ?? ctx.member?.id ?? null;
      const isPrefix = typeof ctx.content === "string";
      let targetId = options?.user?.id ?? options?.user?.user?.id ?? null;
      if (!targetId && isPrefix) {
        const token = (options?._raw ?? [])[0];
        targetId = String(token ?? "").match(/\d{17,20}/)?.[0] ??
          ctx.mentions?.users?.first()?.id ?? null;
      }
      targetId ||= selfId;
      if (!targetId) return manager.sender.reply(manager.sender.errorEmbed("Kullanıcı bulunamadı."));

      // Acknowledge slash interactions before presence lookup and image rendering.
      if (typeof ctx.deferReply === "function" && !ctx.deferred && !ctx.replied) {
        await ctx.deferReply();
      }
      const { activity, owner, foundInGuild } = await locateActivity(client, ctx, targetId);
      if (!activity) {
        const message = targetId !== selfId && !foundInGuild
          ? "⚠️ Kullanıcının oyun etkinliğini görebilmem için botla ortak bir sunucuda bulunması gerekir."
          : "🎮 Bu kullanıcı için görünür bir oyun etkinliği bulunamadı.";
        if (ctx.deferred && typeof ctx.editReply === "function") return ctx.editReply({ content: message });
        return manager.sender.reply(manager.sender.errorEmbed(message));
      }

      const ownerName = displayNameOf(owner, owner?.username ?? ctx.user?.username ?? "Kullanıcı");
      const coverURLs = assetCoverUrls(activity);
      let coverData = await firstImage(coverURLs);
      if (!coverData) {
        const urls = await fallbackCoverUrls(client, activity).catch(() => []);
        coverData = await firstImage(urls);
      }
      const targetUser = owner?.user ?? owner ?? client.users.cache.get(targetId) ??
        await client.users.fetch(targetId).catch(() => null);
      const avatarURL = owner?.displayAvatarURL?.({ size: 256, extension: "png" }) ??
        targetUser?.displayAvatarURL?.({ size: 256, extension: "png" }) ?? null;
      const avatarData = await imageAsDataURI(avatarURL);
      const startedDate = activity.timestamps?.start ? new Date(activity.timestamps.start) : null;
      const validDate = startedDate && Number.isFinite(startedDate.getTime()) ? startedDate : null;
      // Tek görüntü kaynağından iki yerel neon rengi çıkar.
      const palette = await extractGlowPalette(coverData);
      const buffer = await renderGameCard({
        palette,
        gameName: activity.name,
        ownerName,
        coverData,
        avatarData,
        duration: durationParts(validDate),
        started: validDate ? `${pad2(validDate.getHours())}:${pad2(validDate.getMinutes())}` : null,
      });
      const message = { files: [{ name: "game-card.png", attachment: buffer }] };
      if (ctx.deferred && typeof ctx.editReply === "function") return ctx.editReply(message);
      return hybridReply(ctx, message);
    } catch (error) {
      console.error("[game html screenshot error]", error);
      const errorText = "Oyun kartı oluşturulamadı. Chromium/Puppeteer kurulumunu kontrol edin.";
      if (ctx.deferred && typeof ctx.editReply === "function") return ctx.editReply({ content: errorText });
      return manager.sender.reply(manager.sender.errorEmbed(errorText));
    }
  },
};