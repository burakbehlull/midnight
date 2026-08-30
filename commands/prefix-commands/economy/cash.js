import { Economy } from "#models";
import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

export default {
  name: "money",
  description: "Bakiyeni gösterir.",
  aliases: ["cash", "bakiye"],
  usage: ".cash [@kullanıcı]",
  category: "economy",

  permissions: {
    enabled: false,
  },

  async execute(client, message) {
    const target = message.mentions.users.first() || message.author;

    let user = await Economy.findOne({ userId: target.id });
    if (!user) {
      user = new Economy({ userId: target.id });
      await user.save().catch(() => {});
    }

    const createdAt = user.createdAt instanceof Date
      ? user.createdAt
      : new Date(user.createdAt || Date.now());

    const displayName = (target.globalName ?? target.username).toUpperCase();
    const guildName = (message.guild?.name || "MIDNIGHT").toUpperCase();
    const bakiye = user.money ?? 0;

    const W = 800;
    const H = 450;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0d0d0d";
    roundRect(ctx, 0, 0, W, H, 32);
    ctx.fill();

    const glowLeft = ctx.createRadialGradient(150, 100, 10, 150, 100, 280);
    glowLeft.addColorStop(0, "rgba(40, 40, 40, 0.15)");
    glowLeft.addColorStop(0.6, "rgba(20, 20, 20, 0.08)");
    glowLeft.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glowLeft;
    roundRect(ctx, 0, 0, W, H, 32);
    ctx.fill();

    const glowRight = ctx.createRadialGradient(W - 150, H - 100, 10, W - 150, H - 100, 280);
    glowRight.addColorStop(0, "rgba(35, 35, 35, 0.12)");
    glowRight.addColorStop(0.6, "rgba(18, 18, 18, 0.06)");
    glowRight.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glowRight;
    roundRect(ctx, 0, 0, W, H, 32);
    ctx.fill();

    ctx.strokeStyle = "rgba(70,70,70,0.2)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, 2, 2, W - 4, H - 4, 32);
    ctx.stroke();

    const chipX = 50;
    const chipY = 50;
    const chipW = 80;
    const chipH = 60;
    
    const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
    chipGrad.addColorStop(0, "#e6c068");
    chipGrad.addColorStop(0.3, "#f5d98f");
    chipGrad.addColorStop(0.5, "#ead98b");
    chipGrad.addColorStop(0.7, "#d4ab5e");
    chipGrad.addColorStop(1, "#b8934a");
    ctx.fillStyle = chipGrad;
    roundRect(ctx, chipX, chipY, chipW, chipH, 10);
    ctx.fill();
    
    ctx.strokeStyle = "rgba(100, 70, 30, 0.4)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, chipX + 6, chipY + 6, chipW - 12, chipH - 12, 6);
    ctx.stroke();
    
    const gridStartX = chipX + 10;
    const gridStartY = chipY + 10;
    const cellW = (chipW - 20) / 4;
    const cellH = (chipH - 20) / 2;
    
    ctx.strokeStyle = "rgba(100, 70, 30, 0.35)";
    ctx.lineWidth = 1;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const cx = gridStartX + col * cellW;
        const cy = gridStartY + row * cellH;
        roundRect(ctx, cx, cy, cellW - 2, cellH - 2, 2);
        ctx.stroke();
      }
    }

    const avatarSize = 90;
    const ax = W - avatarSize - 50;
    const ay = 40;
    try {
      const avatarUrl = target.displayAvatarURL({ extension: "png", size: 256 });
      const avatarImg = await loadImage(avatarUrl);

      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, ax, ay, avatarSize, avatarSize);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } catch (err) {
      console.error("[cash] Avatar yüklenemedi:", err.message);
    }

    const cardNumber = generateCardNumber(target.id);
    const formatted = cardNumber.match(/.{1,4}/g).join("  ");
    ctx.textAlign = "left";
    ctx.font = "600 36px 'Manrope', 'Inter', sans-serif";
    ctx.fillStyle = "#c8c8c8";
    ctx.fillText(formatted, 50, 180);

    ctx.font = "600 13px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(160, 160, 160, 0.8)";
    ctx.fillText("KART SAHİBİ", 50, 240);

    ctx.font = "700 28px 'Inter', 'Poppins', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.save();
    const ownerName = truncate(ctx, displayName, 400);
    ctx.restore();
    ctx.fillText(ownerName, 50, 272);

    ctx.font = "600 13px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(160, 160, 160, 0.8)";
    ctx.fillText("KATILIM TARIHI", 50, 325);

    const mm = String(createdAt.getMonth() + 1).padStart(2, "0");
    const yy = String(createdAt.getFullYear()).slice(-2);
    const expiryText = `${mm}/${yy}`;
    ctx.font = "700 22px 'Inter', sans-serif";
    ctx.fillStyle = "#e8e8e8";
    ctx.fillText(expiryText, 50, 353);

    ctx.textAlign = "right";
    
    ctx.font = "600 13px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(160, 160, 160, 0.8)";
    ctx.fillText("BAKİYE", W - 50, 325);

    const formattedCoin = Number(bakiye).toLocaleString("tr-TR");
    const maxCoinW = 400;
    let size = 48;
    ctx.font = `800 ${size}px 'Inter', 'Manrope', sans-serif`;
    while (ctx.measureText(formattedCoin).width > maxCoinW && size > 28) {
      size -= 2;
      ctx.font = `800 ${size}px 'Inter', 'Manrope', sans-serif`;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillText(formattedCoin, W - 50, 366);

    ctx.font = "700 16px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(200, 200, 200, 0.9)";
    ctx.fillText("COIN", W - 50, 388);

    ctx.textAlign = "left";
    ctx.font = "700 16px 'Inter', 'Manrope', sans-serif";
    ctx.fillStyle = "rgba(140, 140, 140, 0.6)";
    ctx.save();
    const bankStr = truncate(ctx, `⚡ ${guildName} BANKASI`, 650);
    ctx.restore();
    ctx.fillText(bankStr, 50, H - 30);

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, {
      name: `banka-karti-${target.id}.png`,
    });

    message.channel.send({ files: [attachment] });
  },
};

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (ctx.measureText(text + "…").width > maxWidth && text.length > 1) {
    text = text.slice(0, -1);
  }
  return text + "…";
}

function generateCardNumber(userId) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  let out = "";
  for (let i = 0; i < 16; i++) {
    hash = Math.imul(hash ^ ((hash >>> 15) + i * 0x9e3779b9), 0x85ebca6b);
    hash ^= hash >>> 13;
    out += Math.abs(hash % 10);
  }
  return out;
}
