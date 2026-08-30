import { GatewayIntentBits } from 'discord.js';

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
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
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
    delay
}
