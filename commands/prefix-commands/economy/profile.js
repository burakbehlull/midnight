import { Economy } from '#models';
import { messageSender, misc } from '#helpers';
import { createCanvas, loadImage } from "@napi-rs/canvas";

const { drawRoundedRect } = misc;

function xpForLevel(level) {
  return Math.ceil(Math.pow(level / 0.1, 2));
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

export default {
  name: 'profile',
  description: 'Kullanıcının profilini resim olarak gösterir.',
  usage: '.profile [@kullanıcı]',
  aliases: ['profil', 'p'],
  category: 'economy',

  async execute(client, message, args) {
    const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
    const member = message.mentions.members?.first() || message.guild.members.cache.get(target.id) || message.member;

    const userData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    const width = 900;
    const height = 560;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const accentColors = [
      ["#667eea", "#764ba2"],
      ["#f093fb", "#f5576c"],
      ["#4facfe", "#00f2fe"],
      ["#43e97b", "#38f9d7"],
      ["#fa709a", "#fee140"],
      ["#30cfd0", "#330867"],
      ["#8ec5fc", "#e0c3fc"],
      ["#ff9a9e", "#fecfef"],
    ];
    // Her kullanımda rastgele renk seç
    const colorIdx = Math.floor(Math.random() * accentColors.length);
    const [accent1, accent2] = accentColors[colorIdx];

    let avatarImage;
    try {
      const avatarUrl = target.displayAvatarURL({ dynamic: true, extension: "png", size: 512 });
      avatarImage = await loadImage(avatarUrl);
    } catch (e) {
      avatarImage = null;
    }

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, height);

    const bgGrad1 = ctx.createRadialGradient(width * 0.15, height * 0.2, 20, width * 0.15, height * 0.2, 420);
    bgGrad1.addColorStop(0, accent1 + "55");
    bgGrad1.addColorStop(1, "rgba(10, 10, 15, 0)");
    ctx.fillStyle = bgGrad1;
    ctx.fillRect(0, 0, width, height);

    const bgGrad2 = ctx.createRadialGradient(width * 0.92, height * 0.85, 20, width * 0.92, height * 0.85, 450);
    bgGrad2.addColorStop(0, accent2 + "48");
    bgGrad2.addColorStop(1, "rgba(10, 10, 15, 0)");
    ctx.fillStyle = bgGrad2;
    ctx.fillRect(0, 0, width, height);

    drawRoundedRect(ctx, 20, 20, width - 40, height - 40, 28, "rgba(14, 14, 20, 0.82)", "rgba(255, 255, 255, 0.08)");
    drawRoundedRect(ctx, 26, 26, width - 52, height - 52, 25, null, "rgba(255, 255, 255, 0.03)");

    const avatarX = 65;
    const avatarY = 72;
    const avatarSize = 175;

    ctx.save();
    drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 22, "#111", "rgba(255,255,255,0.1)");
    ctx.beginPath();
    drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 22);
    ctx.clip();
    if (avatarImage) {
      ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    const nameX = avatarX + avatarSize + 38;
    const nameY = avatarY + 8;

    drawRoundedRect(ctx, nameX, nameY - 2, 200, 34, 17, accent1 + "22", accent1 + "55");
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = accent1;
    ctx.fillText("KULLANICI PROFİLİ", nameX + 16, nameY + 21);

    const userBadgeText = `@${target.username}`;
    ctx.font = "bold 14px sans-serif";
    const userBadgeW = ctx.measureText(userBadgeText).width;
    drawRoundedRect(ctx, width - 50 - userBadgeW - 28, nameY - 2, userBadgeW + 28, 34, 17, accent2 + "22", accent2 + "55");
    ctx.fillStyle = accent2;
    ctx.fillText(userBadgeText, width - 50 - userBadgeW - 14, nameY + 21);

    ctx.font = "bold 46px sans-serif";
    ctx.fillStyle = "#ffffff";
    const displayName = (member?.nickname || target.globalName || target.username);
    ctx.font = applyText(canvas, displayName, 46, "sans-serif", 520);
    ctx.fillText(displayName, nameX, nameY + 78);

    // Subtitle (if exists)
    if (userData.subtitle) {
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "rgba(200, 200, 215, 0.78)";
      ctx.font = applyText(canvas, userData.subtitle, 20, "sans-serif", 520);
      ctx.fillText(userData.subtitle, nameX, nameY + 112);
    }

    const levelBoxY = nameY + 128;
    const levelBoxX = nameX;
    const levelBoxW = width - levelBoxX - 50;
    const levelBoxH = 90;
    drawRoundedRect(ctx, levelBoxX, levelBoxY, levelBoxW, levelBoxH, 20, "rgba(22, 22, 30, 0.9)", "rgba(255,255,255,0.06)");

    ctx.save();
    ctx.shadowColor = accent1 + "aa";
    ctx.shadowBlur = 16;
    const levelTextGrad = ctx.createLinearGradient(levelBoxX + 22, levelBoxY + 10, levelBoxX + 22, levelBoxY + 82);
    levelTextGrad.addColorStop(0, accent1);
    levelTextGrad.addColorStop(1, accent2);
    ctx.fillStyle = levelTextGrad;
    ctx.font = "bold 50px sans-serif";
    ctx.fillText(String(userData.level || 1), levelBoxX + 22, levelBoxY + 64);
    ctx.restore();

    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(190,190,205,0.65)";
    ctx.fillText("LEVEL", levelBoxX + 22, levelBoxY + 24);

    const rankX = levelBoxX + 120;
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(190,190,205,0.65)";
    ctx.fillText("RANK", rankX, levelBoxY + 24);
    ctx.font = "bold 23px sans-serif";
    ctx.fillStyle = "#ffffff";
    const rankStr = userData.rank ? `#${formatNumber(userData.rank)}` : "#—";
    ctx.fillText(rankStr, rankX, levelBoxY + 54);

    const xpBoxX = levelBoxX + 230;
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(190,190,205,0.65)";
    ctx.fillText("XP İLERLEMESİ", xpBoxX, levelBoxY + 24);

    const currentXP = userData.xp || 0;
    const currentLevel = userData.level || 1;
    const nextLevelXP = xpForLevel(currentLevel + 1);
    const prevLevelXP = xpForLevel(currentLevel);
    const xpInLevel = Math.max(0, currentXP - prevLevelXP);
    const neededForNext = Math.max(1, nextLevelXP - prevLevelXP);
    const progress = Math.min(1, xpInLevel / neededForNext);

    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#ffffff";
    const xpLabel = `${formatNumber(xpInLevel)} / ${formatNumber(neededForNext)}`;
    const xpLabelW = ctx.measureText(xpLabel).width;
    ctx.fillText(xpLabel, levelBoxX + levelBoxW - 26 - xpLabelW, levelBoxY + 54);

    const barX = xpBoxX;
    const barY = levelBoxY + 68;
    const barW = levelBoxX + levelBoxW - 26 - barX;
    const barH = 9;

    drawRoundedRect(ctx, barX, barY, barW, barH, 4, "rgba(255,255,255,0.07)");

    const filledW = Math.max(9, barW * progress);
    ctx.save();
    ctx.shadowColor = accent1;
    ctx.shadowBlur = 8;
    const xpGrad = ctx.createLinearGradient(barX, barY, barX + filledW, barY);
    xpGrad.addColorStop(0, accent1);
    xpGrad.addColorStop(1, accent2);
    drawRoundedRect(ctx, barX, barY, filledW, barH, 4, xpGrad);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(barX + filledW, barY + barH / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    const statsY = levelBoxY + levelBoxH + 20;
    const statCards = [
      { label: "HEARTS", icon: "", value: userData.hearts || 0, color: "#f43f5e", color2: "#fb7185" },
      { label: "COOKIES", icon: "", value: userData.cookies || 0, color: "#d97706", color2: "#f59e0b" },
    ];
    const cardWidth = 320;
    const totalCardsWidth = statCards.length * cardWidth + (statCards.length - 1) * 20;
    const cardsStartX = (width - totalCardsWidth) / 2;
    statCards.forEach((card, i) => {
      const cx = cardsStartX + i * (cardWidth + 20);
      const cy = statsY;
      const cw = cardWidth;
      const ch = 92;

      const gradTop = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
      gradTop.addColorStop(0, "rgba(28, 28, 38, 0.92)");
      gradTop.addColorStop(1, "rgba(18, 18, 26, 0.92)");
      drawRoundedRect(ctx, cx, cy, cw, ch, 20, gradTop, "rgba(255,255,255,0.06)");

      const badgeLabel = `${card.icon} ${card.label}`;
      ctx.font = "bold 12px sans-serif";
      const badgeW = ctx.measureText(badgeLabel).width + 26;
      const badgeX = cx + 18;
      const badgeY = cy + 14;
      const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + 26);
      badgeGrad.addColorStop(0, card.color);
      badgeGrad.addColorStop(1, card.color2);
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, 26, 13, card.color + "18", badgeGrad + "55");
      ctx.fillStyle = card.color;
      ctx.fillText(badgeLabel, badgeX + 13, badgeY + 18);

      const valGrad = ctx.createLinearGradient(cx + 20, cy + 44, cx + 20, cy + 90);
      valGrad.addColorStop(0, card.color);
      valGrad.addColorStop(1, card.color2);
      ctx.fillStyle = valGrad;
      ctx.font = "bold 34px sans-serif";
      const valText = formatNumber(card.value);
      ctx.save();
      ctx.shadowColor = card.color + "66";
      ctx.shadowBlur = 14;
      ctx.fillText(valText, cx + 20, cy + 80);
      ctx.restore();
    });

    const familyY = statsY + 92 + 22;
    
    // İlişki Durumu Card
    drawRoundedRect(ctx, 70, familyY, 390, 90, 20, "rgba(22, 22, 30, 0.9)", "rgba(255,255,255,0.06)");

    const marrBadgeGrad = ctx.createLinearGradient(90, familyY + 10, 90 + 170, familyY + 30);
    marrBadgeGrad.addColorStop(0, "#ec4899");
    marrBadgeGrad.addColorStop(1, "#f43f5e");
    drawRoundedRect(ctx, 90, familyY + 12, 180, 30, 15, "rgba(236, 72, 153, 0.12)", marrBadgeGrad + "55");
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#ec4899";
    ctx.fillText("İLİŞKİ DURUMU", 105, familyY + 32);

    ctx.font = "bold 19px sans-serif";
    if (userData.marriedTo) {
      const partner = client.users.cache.get(userData.marriedTo);
      const partnerName = partner ? (partner.globalName || partner.username) : `<@${userData.marriedTo}>`;
      ctx.fillStyle = "#ffffff";
      const marriedText = `${partnerName}`;
      ctx.font = applyText(canvas, marriedText, 19, "sans-serif", 340);
      ctx.fillText(marriedText, 90, familyY + 64);

      if (userData.marriageSince) {
        const marrDate = new Date(userData.marriageSince);
        const diffDays = Math.max(0, Math.floor((Date.now() - marrDate.getTime()) / (1000 * 60 * 60 * 24)));
        ctx.font = "13px sans-serif";
        ctx.fillStyle = "rgba(170,170,185,0.7)";
      }
    } else {
      ctx.fillStyle = "rgba(160,160,180,0.7)";
      ctx.fillText("Bekar", 90, familyY + 64);
    }

    const imageBuffer = await canvas.encode("png");

    return message.reply({
      files: [{ name: `profile-${target.id}.png`, attachment: imageBuffer }]
    });
  }
};
