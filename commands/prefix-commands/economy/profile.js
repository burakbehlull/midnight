import puppeteer from "puppeteer";
import sharp from "sharp";
import http from "node:http";
import https from "node:https";
import dns from "node:dns/promises";
import { Economy, Shop } from "#models";
import { misc } from "#helpers";


const { formatNumber } = misc;

const OUTPUT_WIDTH = 1380;
const OUTPUT_HEIGHT = 820;
const MAX_DOWNLOAD = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FALLBACK_PALETTE = {
  left: [147, 85, 206],
  right: [76, 130, 221],
  mid: [112, 106, 211],
};

let browserPromise;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
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
    }).catch(error => {
      browserPromise = null;
      throw error;
    });
  }
  const browser = await browserPromise;
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

function fmt(value) {

  try { return String(formatNumber(Number(value) || 0)); }
  catch { return new Intl.NumberFormat("tr-TR").format(Number(value) || 0); }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function isPublicIPv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a, b, c] = parts;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function acceptableImageURL(value) {
  try {
    const u = new URL(value);
    if (!["https:", "http:"].includes(u.protocol)) return false;
    if (u.username || u.password || !u.hostname) return false;
    if (u.port && !["80", "443"].includes(u.port)) return false;
    // Direkt IP adresi kullanımı kapalı. DNS sonucu ayrıca doğrulanır.
    if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(":")) return false;
    return true;
  } catch { return false; }
}


async function downloadImage(urlString, redirect = 0) {
  if (!acceptableImageURL(urlString) || redirect > MAX_REDIRECTS) return null;
  const url = new URL(urlString);
  try {
    const addresses = await dns.lookup(url.hostname, { family: 4, all: true });

    if (!addresses.length || addresses.some(entry => !isPublicIPv4(entry.address))) return null;
    const pinned = addresses[0].address;
    const transport = url.protocol === "https:" ? https : http;
    return await new Promise(resolve => {
      const req = transport.get(url, {
        timeout: 6500,
        lookup: (host, opts, cb) => cb(null, pinned, 4),
        headers: {
          Accept: "image/png,image/jpeg,image/webp,image/gif,image/avif,*/*;q=0.2",
          "User-Agent": "DiscordProfileCard/1.0",
        },
      }, res => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, url).href;
          downloadImage(next, redirect + 1).then(resolve, () => resolve(null));
          return;
        }
        const type = String(res.headers["content-type"] ?? "").split(";")[0].toLowerCase().trim();
        const supported = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
        if (status !== 200 || !supported.includes(type) ||
            Number(res.headers["content-length"] || 0) > MAX_DOWNLOAD) {
          res.resume();
          resolve(null);
          return;
        }
        let size = 0;
        const chunks = [];
        res.on("data", chunk => {
          size += chunk.length;
          if (size > MAX_DOWNLOAD) {
            req.destroy();
            resolve(null);
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      });
      req.on("timeout", () => req.destroy(new Error("Image timeout")));
      req.on("error", () => resolve(null));
    });
  } catch { return null; }
}

async function toImageData(url, type = "avatar") {
  const raw = await downloadImage(url);
  if (!raw) return null;
  try {
    const limit = type === "background" ? { width: 1600, height: 1100 } : { width: 512, height: 512 };
    const compressed = await sharp(raw, { limitInputPixels: 25_000_000, animated: false })
      .rotate()
      .resize(limit.width, limit.height, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 8 })
      .toBuffer();
    return `data:image/png;base64,${compressed.toString("base64")}`;
  } catch { return null; }
}


async function extractPalette(backgroundData, avatarData) {
  const image = backgroundData || avatarData;
  if (!image) return FALLBACK_PALETTE;
  try {
    const input = Buffer.from(image.slice(image.indexOf(",") + 1), "base64");
    const { data, info } = await sharp(input).resize(96, 96, { fit: "cover" })
      .removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
    const buckets = Array.from({ length: 3 }, () =>
      Array.from({ length: 30 }, () => ({ sum: 0, r: 0, g: 0, b: 0, index: 0 })));

    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
      const v = hi / 255, chroma = (hi - lo) / 255;
      const sat = hi ? (hi - lo) / hi : 0;
      if (v < 0.16 || sat < 0.19 || chroma < 0.08) continue;
      let hue;
      if (hi === r) hue = ((g - b) / (hi - lo)) % 6;
      else if (hi === g) hue = (b - r) / (hi - lo) + 2;
      else hue = (r - g) / (hi - lo) + 4;
      hue = ((hue * 60) % 360 + 360) % 360;
      const bin = Math.min(29, Math.floor(hue / 12));
      const w = Math.pow(sat, 1.55) * Math.sqrt(v) * (0.75 + chroma);
      for (const pos of [x < info.width / 2 ? 0 : 1, 2]) {
        const bucket = buckets[pos][bin];
        bucket.index = bin;
        bucket.sum += w;
        bucket.r += r * w;
        bucket.g += g * w;
        bucket.b += b * w;
      }
    }
    const rank = index => buckets[index].filter(b => b.sum).sort((a,b) => b.sum - a.sum);
    const [leftList, rightList, all] = [rank(0), rank(1), rank(2)];
    const leftEntry = leftList[0], rightFirst = rightList[0];
    let rightEntry = rightFirst;
    const dist = (a,b) => Math.min(Math.abs(a.index-b.index), 30-Math.abs(a.index-b.index));
    if (leftEntry && rightFirst && dist(leftEntry, rightFirst) < 3) {
      const other = [...rightList, ...all]
        .filter(v => dist(leftEntry,v) >= 4)
        .sort((a,b) => b.sum - a.sum)[0];
      if (other && other.sum > (all[0]?.sum || 0) * 0.09) rightEntry = other;
    }
    const convert = entry => {
      if (!entry?.sum) return null;
      const rgb = [entry.r / entry.sum, entry.g / entry.sum, entry.b / entry.sum];
      const mean = rgb.reduce((a,b) => a+b,0)/3;
      const mult = Math.min(1.65, 175 / Math.max(...rgb));
      return rgb.map(v => clamp(Math.round((mean + (v - mean) * 1.15) * mult), 0, 255));
    };
    const left = convert(leftEntry) || FALLBACK_PALETTE.left;
    const right = convert(rightEntry) || FALLBACK_PALETTE.right;
    const mid = left.map((v,i) => Math.round((v+right[i])/2));
    return { left, right, mid };
  } catch { return FALLBACK_PALETTE; }
}

export function buildProfileHTML({
  name, username, subtitle, avatarData, backgroundData,
  level, hearts, cookies, about, partnerName, marriageDays, ring,
  palette = FALLBACK_PALETTE,
}) {
  const initial = escapeHTML(String(name || "?").trim().charAt(0).toLocaleUpperCase("tr-TR"));
  const avatar = avatarData
    ? `<img class="avatar-image" src="${avatarData}" alt="" />`
    : `<span class="avatar-fallback">${initial}</span>`;
  const background = backgroundData
    ? `<img class="background-image" src="${backgroundData}" alt="" />`
    : "";
  const relationship = partnerName
    ? `<div class="relationship-name" title="${escapeHTML(partnerName)}">${escapeHTML(partnerName)}</div>
       <span class="relationship-small">${Number(marriageDays) || 0} gündür birlikte <span class="ring">${escapeHTML(ring || "💍")}</span></span>`
    : `<div class="relationship-name single">Bekar</div><span class="relationship-small">Henüz bir ilişkisi yok</span>`;
  const safeAbout = escapeHTML(about || "Henüz bir açıklama eklenmemiş.");
  const safeSubtitle = escapeHTML(subtitle || "");
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root { color-scheme: dark; --left:${palette.left.join(",")}; --right:${palette.right.join(",")}; --mid:${palette.mid.join(",")}; }
  * { box-sizing:border-box; }
  html,body { margin:0; width:${OUTPUT_WIDTH}px;height:${OUTPUT_HEIGHT}px;overflow:hidden;background:transparent !important; }
  body { font-family:Inter,"Inter Display",Arial,sans-serif; -webkit-font-smoothing:antialiased; }
  .scene { width:${OUTPUT_WIDTH}px; height:${OUTPUT_HEIGHT}px; position:relative;background:transparent;overflow:hidden; }
  .halo { position:absolute; left:58px; top:58px; width:1264px;height:704px;border-radius:47px;
    background:linear-gradient(110deg,rgba(var(--left),.90),rgba(var(--mid),.16) 44%,rgba(var(--right),.90));
    filter:blur(26px);opacity:.34; }
  .card { position:absolute;left:60px;top:60px;width:1260px;height:700px;isolation:isolate;overflow:hidden;
    border-radius:46px;background:
      radial-gradient(ellipse 650px 390px at 8% 7%,rgba(var(--left),.20),transparent 83%),
      radial-gradient(ellipse 530px 480px at 98% 95%,rgba(var(--right),.16),transparent 79%),
      linear-gradient(118deg,#141722 0%,#0f1420 54%,#101827 100%);
    box-shadow:0 35px 80px rgba(0,0,0,.35); }
  .card::before {content:"";position:absolute;inset:0;pointer-events:none;z-index:8;padding:2px;border-radius:46px;
    background:linear-gradient(108deg,rgba(var(--left),.98),rgba(var(--left),.58) 15%,rgba(var(--mid),.19) 45%,rgba(var(--right),.43) 78%,rgba(var(--right),1));
    -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;}
  .background-image {position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.31;filter:saturate(.93) brightness(.75);z-index:0;}
  .background-shade {position:absolute;inset:0;z-index:1;
    background:linear-gradient(90deg,rgba(9,12,21,.86) 0%,rgba(12,17,27,.76) 53%,rgba(11,14,24,.88) 100%),
      linear-gradient(0deg,rgba(4,7,13,.72),transparent 64%);}
  .left-bloom,.right-bloom {position:absolute;z-index:2;pointer-events:none;filter:blur(26px);}
  .left-bloom {left:-65px;bottom:-75px;width:340px;height:345px;background:radial-gradient(ellipse,rgba(var(--left),.27),transparent 68%);}
  .right-bloom {right:-65px;top:-75px;width:330px;height:330px;background:radial-gradient(ellipse,rgba(var(--right),.25),transparent 68%);}
  .inner {position:relative;z-index:3;padding:53px 55px 46px;height:100%;}
  .header {position:relative;height:240px;display:flex;gap:40px;}
  .avatar {width:174px;height:174px;flex:0 0 174px;position:relative;overflow:hidden;border-radius:38px;
    background:linear-gradient(140deg,rgba(var(--left),.74),rgba(var(--right),.60));
    box-shadow:0 0 0 1.5px rgba(var(--mid),.76),0 14px 40px rgba(0,0,0,.37),0 0 35px rgba(var(--left),.13);
    display:flex;align-items:center;justify-content:center;}
  .avatar-image {width:100%;height:100%;object-fit:cover;display:block;}
  .avatar-fallback {font-size:90px;font-weight:750;color:#fff;}
  .identity {padding-top:4px;min-width:0;flex:1;}
  .eyebrow {display:flex;gap:12px;align-items:center;letter-spacing:2.7px;font-size:18px;font-weight:550;color:#a3adc4;}
  .dot {height:14px;width:14px;border-radius:50%;background:rgb(var(--left));box-shadow:0 0 17px rgba(var(--left),.35);}
  .display-name {margin:18px 0 0;font-size:69px;font-weight:720;letter-spacing:-2.3px;line-height:1.08;
    color:#f7f8ff;max-width:850px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .subtitle {margin:8px 0 0;min-height:25px;color:#b5bdd3;font-size:24px;font-weight:430;font-style:italic;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .tags {display:flex;align-items:center;gap:12px;margin-top:19px;max-width:100%;}
  .tag {min-width:0;display:inline-flex;align-items:center;height:39px;padding:0 19px;border-radius:30px;
    background:rgba(123,134,170,.14);box-shadow:inset 0 0 0 1px rgba(201,210,243,.09);
    font-size:18px;color:#d6dcef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .handle {max-width:560px;}
  .level {flex-shrink:0;color:#f6f5ff;background:linear-gradient(105deg,rgba(var(--left),.32),rgba(var(--right),.27));
    box-shadow:inset 0 0 0 1px rgba(var(--mid),.48);font-weight:700;}
  .header-line {position:absolute;top:282px;left:55px;right:55px;height:1px;
    background:linear-gradient(90deg,rgba(var(--left),.28),rgba(220,229,255,.09) 50%,rgba(var(--right),.28));}
  .stats {display:grid;grid-template-columns:1fr 1fr 1.22fr;gap:18px;margin-top:10px;}
  .stat {height:143px;border-radius:26px;padding:24px 27px;min-width:0;
    background:linear-gradient(122deg,rgba(31,37,55,.71),rgba(25,31,48,.55));
    box-shadow:inset 0 0 0 1px rgba(213,224,255,.095),0 12px 28px rgba(0,0,0,.11);}
  .stat-label {font-size:17px;letter-spacing:2.0px;font-weight:640;color:#a2acc3;display:flex;align-items:center;gap:10px;}
  .mini-symbol {font-size:20px;line-height:1.2;letter-spacing:0;}
  .heart {color:#fc809b;} .cookie {color:#f8c383;} .relationship {color:#d9b3ff;}
  .stat-value {margin-top:12px;color:#f7f8ff;font-size:47px;font-weight:700;letter-spacing:-1.2px;line-height:1.15;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .relationship-name {margin-top:9px;font-size:31px;font-weight:700;color:#f4f4ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .relationship-name.single {color:#d8dded;}
  .relationship-small {display:block;color:#9ca7bf;font-size:17px;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .ring {font-family:system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif;}
  .about {margin-top:21px;height:171px;border-radius:28px;padding:28px 32px;min-width:0;
    background:linear-gradient(118deg,rgba(30,36,53,.71),rgba(21,27,42,.59));
    box-shadow:inset 0 0 0 1px rgba(213,224,255,.10);}
  .about-label {font-size:19px;letter-spacing:2.1px;font-weight:650;color:#c8d0e6;}
  .about-indicator {display:inline-block;width:7px;height:18px;border-radius:4px;margin-right:12px;
    background:linear-gradient(180deg,rgb(var(--left)),rgb(var(--right)));vertical-align:-2px;}
  .about-text {font-size:25px;line-height:1.45;color:#e1e5f1;margin-top:16px;
    overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere;}
</style></head>
<body><div class="scene"><div class="halo"></div>
<article class="card" role="img" aria-label="${escapeHTML(name)} kullanıcısının profili">
${background}<div class="background-shade"></div><div class="left-bloom"></div><div class="right-bloom"></div>
<div class="inner"><header class="header">
 <div class="avatar">${avatar}</div><div class="identity">
  <div class="eyebrow"><span class="dot"></span><span>KULLANICI PROFİLİ</span></div>
  <h1 class="display-name">${escapeHTML(name)}</h1>
  ${subtitle ? `<p class="subtitle">${safeSubtitle}</p>` : `<p class="subtitle" style="opacity:0">&nbsp;</p>`}
  <div class="tags"><span class="tag handle">@${escapeHTML(username)}</span><span class="tag level">SEVİYE ${escapeHTML(level)}</span></div>
 </div></header>
 <div class="header-line"></div>
 <div class="stats">
  <div class="stat"><div class="stat-label"><span class="mini-symbol heart">♥</span> HEARTS</div><div class="stat-value">${escapeHTML(hearts)}</div></div>
  <div class="stat"><div class="stat-label"><span class="mini-symbol cookie">◉</span> COOKIES</div><div class="stat-value">${escapeHTML(cookies)}</div></div>
  <div class="stat"><div class="stat-label relationship">İLİŞKİ</div>${relationship}</div>
 </div>
 <section class="about"><div class="about-label"><span class="about-indicator"></span>HAKKIMDA</div>
   <div class="about-text">${safeAbout}</div></section>
</div></article></div></body></html>`;
}

export async function renderProfileCard(data) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (request.url().startsWith("data:") || request.url() === "about:blank") request.continue();
      else request.abort();
    });
    await page.setContent(buildProfileHTML(data), { waitUntil: "load", timeout: 15000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    });
    return await page.screenshot({
      type: "png", omitBackground: true, fullPage: false, animations: "disabled",
    });
  } finally {
    await page.close();
  }
}

export default {
  name: "profile",
  description: "Kullanıcının profilini resim olarak gösterir, alt yazı/about/arka plan ayarlar.",
  usage: ".profile [@kullanıcı] veya .profile subtitle <metin> veya .profile about <metin> veya .profile bg <url>",
  aliases: ["profil", "p"],
  category: "economy",
  permissions: { enabled: false },

  async execute(client, message, args = []) {
    try {
      const action = args[0]?.toLowerCase();
      if (["subtitle", "about", "hakkimda", "bg", "background", "arkaplan"].includes(action)) {
        const content = args.slice(1).join(" ").trim();
        const attachment = message.attachments?.first?.();
        if (!content && !( ["bg", "background", "arkaplan"].includes(action) && attachment )) {
          const example = action === "subtitle" ? "subtitle <metin>" :
            ["about", "hakkimda"].includes(action) ? "about <metin>" : "bg <url veya ek>";
          return message.reply(`❌ Bir değer gir veya kaldırmak için \`clear\` yaz. Kullanım: \`.profile ${example}\``);
        }
        const userData = await Economy.findOne({ userId: message.author.id }) || new Economy({ userId: message.author.id });
        const isClear = ["clear", "sil"].includes(content.toLowerCase());

        if (action === "subtitle") {
          if (content.length > 20) return message.reply("❌ Alt yazı en fazla 20 karakter olabilir!");
          userData.subtitle = isClear ? null : content;
          await userData.save();
          return message.reply(isClear ? "Alt yazı kaldırıldı!" : `Alt yazınız ayarlandı! **${content}**`);
        }
        if (["about", "hakkimda"].includes(action)) {
          if (content.length > 80) return message.reply("❌ Hakkımda metni en fazla 80 karakter olabilir!");
          userData.about = isClear ? null : content;
          await userData.save();
          return message.reply(isClear ? "Hakkımda metni kaldırıldı!" : `Hakkımda metniniz ayarlandı! **${content}**`);
        }
        if (isClear) {
          userData.background = null;
          await userData.save();
          return message.reply("Arka plan kaldırıldı!");
        }
        const input = attachment?.url || content;
        const mime = attachment?.contentType;
        if (attachment && ((mime && !mime.startsWith("image/")) ||
              (attachment.size && attachment.size > MAX_DOWNLOAD))) {
          return message.reply("❌ Ek bir resim olmalı ve 8 MB'ı geçmemeli.");
        }
        if (!acceptableImageURL(input)) {
          return message.reply("❌ Geçerli bir http/https resim URL'si veya görsel eki gönderin.");
        }
        const verified = await toImageData(input, "background");
        if (!verified) return message.reply("❌ Bu görsel indirilemedi veya güvenli şekilde doğrulanamadı.");
        userData.background = input;
        await userData.save();
        return message.reply("Arka plan resminiz ayarlandı!");
      }

      const target = message.mentions?.users?.first?.() ||
        (args[0] && /^\d{17,20}$/.test(args[0])
          ? client.users.cache.get(args[0]) || await client.users.fetch(args[0]).catch(() => null)
          : null) || message.author;
      const member = message.guild
        ? (message.mentions?.members?.first?.() ||
            message.guild.members.cache.get(target.id) ||
            await message.guild.members.fetch(target.id).catch(() => null))
        : null;
      const userData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });
      const name = member?.displayName || target.globalName || target.username;
      const avatarURL = member?.displayAvatarURL?.({ extension: "png", size: 512 }) ||
        target.displayAvatarURL({ extension: "png", size: 512 });

      const [avatarData, backgroundData, ringItem, partner] = await Promise.all([
        toImageData(avatarURL, "avatar"),
        userData.background ? toImageData(userData.background, "background") : null,
        userData.marriageRing ? Shop.findOne({ slug: userData.marriageRing }).catch(() => null) : null,
        userData.marriedTo
          ? client.users.cache.get(userData.marriedTo) || client.users.fetch(userData.marriedTo).catch(() => null)
          : null,
      ]);

      const palette = await extractPalette(backgroundData, avatarData);
      const since = userData.marriageSince ? new Date(userData.marriageSince) : null;
      const marriageDays = since && Number.isFinite(since.getTime())
        ? Math.max(0, Math.floor((Date.now() - since.getTime()) / 86_400_000)) : 0;
      const png = await renderProfileCard({
        name, username: target.username,
        subtitle: userData.subtitle || "",
        avatarData, backgroundData, palette,
        level: userData.level || 1,
        hearts: fmt(userData.hearts),
        cookies: fmt(userData.cookies),
        about: userData.about || "",
        partnerName: userData.marriedTo
          ? (partner?.globalName || partner?.username || `@${userData.marriedTo}`)
          : null,
        marriageDays,
        ring: ringItem?.emoji || "💍",
      });
      return message.reply({ files: [{ name: `profile-${target.id}.png`, attachment: png }] });
    } catch (error) {
      console.error("[profile html error]", error);
      return message.reply("❌ Profil kartı oluşturulamadı. Chromium/Puppeteer kurulumunu kontrol edin.");
    }
  },
};