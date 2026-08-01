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
  description: 'Kullanıcının profilini resim olarak gösterir veya alt yazı ayarlar.',
  usage: '.profile [@kullanıcı] veya .profile subtitle <metin>',
  aliases: ['profil', 'p'],
  category: 'economy',

  async execute(client, message, args) {
    if (args[0]?.toLowerCase() === 'subtitle') {
      const subtitleText = args.slice(1).join(' ');
      
      if (!subtitleText) {
        return message.reply('❌ Lütfen bir alt yazı girin veya `clear` yazarak kaldırın.\n**Kullanım:** `.profile subtitle <metin>` veya `.profile subtitle clear`');
      }

      const userData = await Economy.findOne({ userId: message.author.id });
      if (!userData) {
        return message.reply('❌ Profil bulunamadı! Önce profil komutunu kullanın.');
      }

      if (subtitleText.toLowerCase() === 'clear' || subtitleText.toLowerCase() === 'sil') {
        userData.subtitle = null;
        await userData.save();
        return message.reply('Alt yazı kaldırıldı!');
      }

      if (subtitleText.length > 20) {
        return message.reply('❌ Alt yazı en fazla 20 karakter olabilir!');
      }

      userData.subtitle = subtitleText;
      await userData.save();

      return message.reply(`Alt yazınız ayarlandı! **${subtitleText}**`);
    }

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
    const nameY = avatarY - 10;  // 10px yukarı kaldırıldı

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

    if (userData.subtitle) {
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "rgba(200, 200, 215, 0.78)";
      ctx.font = applyText(canvas, userData.subtitle, 20, "sans-serif", 520);
      ctx.fillText(userData.subtitle, nameX, nameY + 112);
    }

    const statsBoxY = nameY + 148;  // 20px aşağı (128 + 20)
    const statsBoxX = nameX;
    const statsBoxW = width - statsBoxX - 50;
    const statsBoxH = 180;
    drawRoundedRect(ctx, statsBoxX, statsBoxY, statsBoxW, statsBoxH, 20, "rgba(22, 22, 30, 0.9)", "rgba(255,255,255,0.06)");

    ctx.save();
    ctx.shadowColor = accent1 + "aa";
    ctx.shadowBlur = 16;
    const levelTextGrad = ctx.createLinearGradient(statsBoxX + 22, statsBoxY + 10, statsBoxX + 22, statsBoxY + 82);
    levelTextGrad.addColorStop(0, accent1);
    levelTextGrad.addColorStop(1, accent2);
    ctx.fillStyle = levelTextGrad;
    ctx.font = "bold 50px sans-serif";
    ctx.fillText(String(userData.level || 1), statsBoxX + 22, statsBoxY + 64);
    ctx.restore();

    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(190,190,205,0.65)";
    ctx.fillText("LEVEL", statsBoxX + 22, statsBoxY + 24);

    const rankX = statsBoxX + 120;
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(190,190,205,0.65)";
    ctx.fillText("RANK", rankX, statsBoxY + 24);
    ctx.font = "bold 23px sans-serif";
    ctx.fillStyle = "#ffffff";
    const rankStr = userData.rank ? `#${formatNumber(userData.rank)}` : "#—";
    ctx.fillText(rankStr, rankX, statsBoxY + 54);

    const xpBoxX = statsBoxX + 230;
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(190,190,205,0.65)";
    ctx.fillText("XP", xpBoxX, statsBoxY + 24);

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
    ctx.fillText(xpLabel, statsBoxX + statsBoxW - 26 - xpLabelW, statsBoxY + 54);

    const barX = xpBoxX;
    const barY = statsBoxY + 68;
    const barW = statsBoxX + statsBoxW - 26 - barX;
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

    const currencyY = statsBoxY + 95;
    
    const heartBadgeGrad = ctx.createLinearGradient(statsBoxX + 22, currencyY, statsBoxX + 22 + 120, currencyY + 30);
    heartBadgeGrad.addColorStop(0, "#f43f5e");
    heartBadgeGrad.addColorStop(1, "#fb7185");
    drawRoundedRect(ctx, statsBoxX + 22, currencyY, 120, 30, 15, "rgba(244, 63, 94, 0.12)", heartBadgeGrad + "55");
    
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#f43f5e";
    ctx.fillText("", statsBoxX + 37, currencyY + 22);
    
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#f43f5e";
    ctx.fillText("HEARTS", statsBoxX + 62, currencyY + 20);

    const heartValGrad = ctx.createLinearGradient(statsBoxX + 22, currencyY + 35, statsBoxX + 22, currencyY + 75);
    heartValGrad.addColorStop(0, "#f43f5e");
    heartValGrad.addColorStop(1, "#fb7185");
    ctx.fillStyle = heartValGrad;
    ctx.font = "bold 34px sans-serif";
    ctx.save();
    ctx.shadowColor = "#f43f5e66";
    ctx.shadowBlur = 14;
    ctx.fillText(formatNumber(userData.hearts || 0), statsBoxX + 22, currencyY + 65);
    ctx.restore();

    const cookieBadgeGrad = ctx.createLinearGradient(statsBoxX + 180, currencyY, statsBoxX + 180 + 130, currencyY + 30);
    cookieBadgeGrad.addColorStop(0, "#d97706");
    cookieBadgeGrad.addColorStop(1, "#f59e0b");
    drawRoundedRect(ctx, statsBoxX + 180, currencyY, 140, 30, 15, "rgba(217, 119, 6, 0.12)", cookieBadgeGrad + "55");
    
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#d97706";
    ctx.fillText("", statsBoxX + 195, currencyY + 22);
    
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#d97706";
    ctx.fillText("COOKIES", statsBoxX + 220, currencyY + 20);

    const cookieValGrad = ctx.createLinearGradient(statsBoxX + 180, currencyY + 35, statsBoxX + 180, currencyY + 75);
    cookieValGrad.addColorStop(0, "#d97706");
    cookieValGrad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = cookieValGrad;
    ctx.font = "bold 34px sans-serif";
    ctx.save();
    ctx.shadowColor = "#d9770666";
    ctx.shadowBlur = 14;
    ctx.fillText(formatNumber(userData.cookies || 0), statsBoxX + 180, currencyY + 65);
    ctx.restore();

    const statsY = statsBoxY + statsBoxH + 20;

    const familyY = statsY;
    const familyX = width - 480;
    const familyW = 430;
    
    drawRoundedRect(ctx, familyX, familyY, familyW, 100, 20, "rgba(22, 22, 30, 0.9)", "rgba(255,255,255,0.06)");

    const marrBadgeGrad = ctx.createLinearGradient(familyX + 20, familyY + 10, familyX + 20 + 170, familyY + 30);
    marrBadgeGrad.addColorStop(0, "#ec4899");
    marrBadgeGrad.addColorStop(1, "#f43f5e");
    drawRoundedRect(ctx, familyX + 20, familyY + 14, 180, 30, 15, "rgba(236, 72, 153, 0.12)", marrBadgeGrad + "55");
    
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#ec4899";
    ctx.fillText("", familyX + 35, familyY + 33);
    
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#ec4899";
    ctx.fillText("RELATIONSHIP", familyX + 58, familyY + 34);

    if (userData.marriedTo) {
      const partner = client.users.cache.get(userData.marriedTo);
      const partnerName = partner ? (partner.globalName || partner.username) : `<@${userData.marriedTo}>`;
      
      if (userData.marriageSince) {
        const marrDate = new Date(userData.marriageSince);
        const diffDays = Math.max(0, Math.floor((Date.now() - marrDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${diffDays} days`, familyX + 20, familyY + 68);
      } else {
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("0 days", familyX + 20, familyY + 68);
      }
      
      ctx.font = "bold 36px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.font = applyText(canvas, partnerName, 36, "sans-serif", 240);
      const nameWidth = ctx.measureText(partnerName).width;
      const rightBoxX = familyX + 220;
      const rightBoxW = familyW - 220;
      const centerX = rightBoxX + (rightBoxW - nameWidth) / 2;
      ctx.fillText(partnerName, centerX, familyY + 73);
      
    } else {
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "rgba(160,160,180,0.7)";
      ctx.fillText("Yok", familyX + 20, familyY + 68);
      
      ctx.font = "bold 36px sans-serif";
      ctx.fillStyle = "rgba(160,160,180,0.5)";
      const bekarWidth = ctx.measureText("Bekar").width;
      const rightBoxX = familyX + 220;
      const rightBoxW = familyW - 220;
      const centerX = rightBoxX + (rightBoxW - bekarWidth) / 2;
      ctx.fillText("Bekar", centerX, familyY + 73);
    }

    const imageBuffer = await canvas.encode("png");

    return message.reply({
      files: [{ name: `profile-${target.id}.png`, attachment: imageBuffer }]
    });
  }
};
