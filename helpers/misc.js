import { GatewayIntentBits } from 'discord.js';
import { loadImage } from "@napi-rs/canvas";

function randomColor(){
	return Math.floor(Math.random() * (0xffffff + 1))
}

function itentsMiddle(){
	return [
		GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
	]
}

function itentsAll(){
    return Object.keys(GatewayIntentBits).map((intent) => GatewayIntentBits[intent])
}

function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle = null, lineWidth = 1) {
    const r = Math.min(radius, width / 2, height / 2);
    const inset = strokeStyle ? lineWidth / 2 : 0;
    const fx = x + inset;
    const fy = y + inset;
    const fw = width - inset * 2;
    const fh = height - inset * 2;
    const fr = Math.max(0, r - inset);

    ctx.beginPath();
    ctx.moveTo(fx + fr, fy);
    ctx.lineTo(fx + fw - fr, fy);
    ctx.quadraticCurveTo(fx + fw, fy, fx + fw, fy + fr);
    ctx.lineTo(fx + fw, fy + fh - fr);
    ctx.quadraticCurveTo(fx + fw, fy + fh, fx + fw - fr, fy + fh);
    ctx.lineTo(fx + fr, fy + fh);
    ctx.quadraticCurveTo(fx, fy + fh, fx, fy + fh - fr);
    ctx.lineTo(fx, fy + fr);
    ctx.quadraticCurveTo(fx, fy, fx + fr, fy);
    ctx.closePath();

    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.lineWidth = 1;
    }
}

function formatTime(ms) {
    if (!ms || isNaN(ms) || ms < 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTimeLeft(msTime) {
    const seconds = Math.max(1, Math.floor(msTime / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const future = new Date(Date.now() + msTime);
    const saat = future.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const tarih = future.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    let relative;
    if (seconds <= 60) {
        relative = `${seconds} saniye kaldı`;
    } else if (minutes < 60) {
        relative = `${minutes} dakika kaldı`;
    } else {
        relative = `${hours} saat${minutes % 60 > 0 ? ` ${minutes % 60} dakika` : ''} kaldı`;
    }

    return {
        relative,
        exact: `${tarih} ${saat}`,
        shortTime: `bugün saat ${saat}`
    };
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toString();
}

function applyText(canvas, text, defaultFontSize, fontFamily, maxWidth) {
    const ctx = canvas.getContext("2d");
    let fontSize = defaultFontSize;
    do {
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        fontSize--;
    } while (ctx.measureText(text).width > maxWidth);
    return ctx.font;
}

function xpForLevel(level) {
    return Math.ceil(Math.pow(level / 0.1, 2));
}

const formatTopUsers = async (array, fieldName, guild) => {
    const formatted = await Promise.all(array.map(async (data, index) => {
        const user = await guild.members.fetch(data.userId).catch(() => null);
        const username = user ? `${user.user.globalName || user.user.username}` : `Unknown (${data.userId})`;
        return `\` ${index + 1} \` **${username}**: ${data[fieldName]}`;
    }));
    return formatted.join('\n');
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseDiscordEmoji(input) {
  if (!input) return null;
  const str = String(input).trim();

  const m = str.match(/^<?(a)?:?([a-zA-Z0-9_]{2,32}):(\d{17,20})>?/);
  if (m) {
    return {
      animated: m[1] === "a",
      name: m[2],
      id: m[3],
      url: `https://cdn.discordapp.com/emojis/${m[3]}.${m[1] === "a" ? "gif" : "png"}?v=1&size=256`,
    };
  }

  if (/^\d{17,20}$/.test(str)) {
    return {
      animated: false,
      name: "emoji",
      id: str,
      url: `https://cdn.discordapp.com/emojis/${str}.png?v=1&size=256`,
    };
  }

  return null;
}

async function drawEmoji(ctx, emojiInput, x, y, size) {
  const parsed = parseDiscordEmoji(emojiInput);
  if (!parsed) return false;

  let img = null;
  try {
    img = await loadImage(parsed.url);
  } catch {
    return false;
  }

  ctx.drawImage(img, x, y, size, size);
  return true;
}

export {
	randomColor,
	itentsMiddle,
	itentsAll,
	calculateLevel,
	drawRoundedRect,
	formatTime,
    formatTimeLeft,
    formatNumber,
    applyText,
    xpForLevel,
    formatTopUsers,
    delay,
    parseDiscordEmoji,
    drawEmoji
}
