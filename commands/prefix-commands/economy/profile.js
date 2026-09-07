import { misc } from '#helpers';
import { Economy } from '#models';
import { createCanvas, loadImage } from "@napi-rs/canvas";

const { drawRoundedRect, formatNumber, applyText } = misc;

export default {
  name: 'profile',
  description: 'Kullanıcının profilini resim olarak gösterir, alt yazı/about/arka plan ayarlar.',
  usage: '.profile [@kullanıcı] veya .profile subtitle <metin> veya .profile about <metin> veya .profile bg <url>',
  aliases: ['profil', 'p'],
  category: 'economy',

  permissions: {
    enabled: false
  },

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

    if (args[0]?.toLowerCase() === 'about' || args[0]?.toLowerCase() === 'hakkimda') {
      const aboutText = args.slice(1).join(' ');

      if (!aboutText) {
        return message.reply('❌ Lütfen bir hakkımda metni girin veya `clear` yazarak kaldırın.\n**Kullanım:** `.profile about <metin>` veya `.profile about clear`');
      }

      const userData = await Economy.findOne({ userId: message.author.id }) || new Economy({ userId: message.author.id });

      if (aboutText.toLowerCase() === 'clear' || aboutText.toLowerCase() === 'sil') {
        userData.about = null;
        await userData.save();
        return message.reply('Hakkımda metni kaldırıldı!');
      }

      if (aboutText.length > 80) {
        return message.reply('❌ Hakkımda metni en fazla 80 karakter olabilir!');
      }

      userData.about = aboutText;
      await userData.save();

      return message.reply(`Hakkımda metniniz ayarlandı! **${aboutText}**`);
    }

    if (args[0]?.toLowerCase() === 'bg' || args[0]?.toLowerCase() === 'background' || args[0]?.toLowerCase() === 'arkaplan') {
      const bgInput = args.slice(1).join(' ');

      if (!bgInput) {
        return message.reply('❌ Lütfen bir resim URL\'si girin veya `clear` yazarak kaldırın.\n**Kullanım:** `.profile bg <resim-url>` veya `.profile bg clear`');
      }

      const userData = await Economy.findOne({ userId: message.author.id }) || new Economy({ userId: message.author.id });

      if (bgInput.toLowerCase() === 'clear' || bgInput.toLowerCase() === 'sil') {
        userData.background = null;
        await userData.save();
        return message.reply('Arka plan kaldırıldı!');
      }

      const urlMatch = bgInput.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i);
      const attachment = message.attachments.first();
      let finalUrl = null;

      if (attachment) {
        finalUrl = attachment.url;
      } else if (urlMatch) {
        finalUrl = urlMatch[0];
      } else {
        return message.reply('❌ Geçerli bir resim URL\'si veya ek (png/jpg/jpeg/gif/webp) girin!');
      }

      userData.background = finalUrl;
      await userData.save();

      return message.reply('Arka plan resminiz ayarlandı!');
    }

    const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
    const member = message.mentions.members?.first() || message.guild.members.cache.get(target.id) || message.member;

    const userData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    const width = 1100;
    const height = 620;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const accent1 = "#7c3aed";
    const accent2 = "#a855f7";

    let avatarImage;
    try {
      const avatarUrl = target.displayAvatarURL({ dynamic: true, extension: "png", size: 512 });
      avatarImage = await loadImage(avatarUrl);
    } catch (e) {
      avatarImage = null;
    }

    let backgroundImage = null;
    if (userData.background) {
      try {
        backgroundImage = await loadImage(userData.background);
      } catch (e) {
        backgroundImage = null;
      }
    }

    const outerRadius = 42;
    const cardInsetX = 20;
    const cardInsetY = 20;
    const cardW = width - cardInsetX * 2;
    const cardH = height - cardInsetY * 2;

    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, cardInsetX, cardInsetY, cardW, cardH, outerRadius);
    ctx.clip();

    if (backgroundImage) {
      const imgRatio = backgroundImage.width / backgroundImage.height;
      const boxRatio = cardW / cardH;
      let sx = 0, sy = 0, sw = backgroundImage.width, sh = backgroundImage.height;
      if (imgRatio > boxRatio) {
        sw = backgroundImage.height * boxRatio;
        sx = (backgroundImage.width - sw) / 2;
      } else {
        sh = backgroundImage.width / boxRatio;
        sy = (backgroundImage.height - sh) / 2;
      }
      ctx.drawImage(backgroundImage, sx, sy, sw, sh, cardInsetX, cardInsetY, cardW, cardH);

      const darkOverlay = ctx.createLinearGradient(cardInsetX, cardInsetY, cardInsetX, cardInsetY + cardH);
      darkOverlay.addColorStop(0, "rgba(0, 0, 0, 0.35)");
      darkOverlay.addColorStop(0.5, "rgba(0, 0, 0, 0.55)");
      darkOverlay.addColorStop(1, "rgba(0, 0, 0, 0.72)");
      ctx.fillStyle = darkOverlay;
      ctx.fillRect(cardInsetX, cardInsetY, cardW, cardH);

      const vignette = ctx.createRadialGradient(
        cardInsetX + cardW / 2, cardInsetY + cardH / 2, cardW * 0.2,
        cardInsetX + cardW / 2, cardInsetY + cardH / 2, cardW * 0.75
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.55)");
      ctx.fillStyle = vignette;
      ctx.fillRect(cardInsetX, cardInsetY, cardW, cardH);
    } else {
      const bgGrad = ctx.createLinearGradient(cardInsetX, cardInsetY, cardInsetX + cardW, cardInsetY + cardH);
      bgGrad.addColorStop(0, "#1a0b2e");
      bgGrad.addColorStop(0.5, "#2d1b4e");
      bgGrad.addColorStop(1, "#3d1f5c");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(cardInsetX, cardInsetY, cardW, cardH);

      const radial1 = ctx.createRadialGradient(cardInsetX + cardW * 0.15, cardInsetY + cardH * 0.2, 20, cardInsetX + cardW * 0.15, cardInsetY + cardH * 0.2, 450);
      radial1.addColorStop(0, accent1 + "55");
      radial1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = radial1;
      ctx.fillRect(cardInsetX, cardInsetY, cardW, cardH);

      const radial2 = ctx.createRadialGradient(cardInsetX + cardW * 0.9, cardInsetY + cardH * 0.8, 20, cardInsetX + cardW * 0.9, cardInsetY + cardH * 0.8, 420);
      radial2.addColorStop(0, accent2 + "4a");
      radial2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = radial2;
      ctx.fillRect(cardInsetX, cardInsetY, cardW, cardH);
    }
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, cardInsetX, cardInsetY, cardW, cardH, outerRadius, null, "rgba(255, 255, 255, 0.1)", 1.5);
    drawRoundedRect(ctx, cardInsetX + 3, cardInsetY + 3, cardW - 6, cardH - 6, outerRadius - 3, null, "rgba(255, 255, 255, 0.04)", 1);
    ctx.restore();

    const headerPadL = 56;
    const headerPadR = 56;
    const headerY = cardInsetY + 54;

    const avatarX = headerPadL;
    const avatarY = headerY;
    const avatarSize = 156;

    ctx.save();
    drawRoundedRect(ctx, avatarX - 6, avatarY - 6, avatarSize + 12, avatarSize + 12, 36, "rgba(0, 0, 0, 0.4)", accent2 + "99", 3);
    drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 32, "#111", "rgba(255,255,255,0.12)", 1);
    ctx.beginPath();
    drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 32);
    ctx.clip();
    if (avatarImage) {
      ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    const nameX = avatarX + avatarSize + 36;
    const nameY = headerY + 10;

    ctx.font = "bold 54px sans-serif";
    ctx.fillStyle = "#ffffff";
    const displayName = (member?.nickname || target.globalName || target.username);
    ctx.font = applyText(canvas, displayName, 54, "sans-serif", 540);
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 8;
    ctx.fillText(displayName, nameX, nameY + 44);
    ctx.restore();

    if (userData.subtitle) {
      ctx.font = "italic 24px sans-serif";
      ctx.fillStyle = "rgba(230, 230, 245, 0.88)";
      ctx.font = applyText(canvas, userData.subtitle, 24, "sans-serif", 540);
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 6;
      ctx.fillText(userData.subtitle, nameX, nameY + 82);
      ctx.restore();
    }

    const userTagY = nameY + 114;
    const tagText = `@${target.username}`;
    ctx.font = "bold 14px sans-serif";
    const tagW = ctx.measureText(tagText).width;
    drawRoundedRect(ctx, nameX, userTagY, tagW + 28, 34, 17, "rgba(0, 0, 0, 0.35)", "rgba(255, 255, 255, 0.14)", 1);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText(tagText, nameX + 14, userTagY + 22);

    const levelBadgeX = nameX + tagW + 44;
    const levelText = `Lv. ${userData.level || 1}`;
    ctx.font = "bold 14px sans-serif";
    const levelBadgeW = ctx.measureText(levelText).width + 32;
    ctx.save();
    ctx.shadowColor = accent1 + "88";
    ctx.shadowBlur = 14;
    const levelBadgeGrad = ctx.createLinearGradient(levelBadgeX, userTagY, levelBadgeX + levelBadgeW, userTagY);
    levelBadgeGrad.addColorStop(0, accent1);
    levelBadgeGrad.addColorStop(1, accent2);
    drawRoundedRect(ctx, levelBadgeX, userTagY, levelBadgeW, 34, 17, levelBadgeGrad, "rgba(255,255,255,0.22)", 1.5);
    ctx.restore();
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(levelText, levelBadgeX + 16, userTagY + 22);

    const currencyY = cardInsetY + 240;
    const statsPadX = 44;
    const leftColX = cardInsetX + statsPadX;
    const mainStatsW = cardW - statsPadX * 2;

    const heartsW = 230;
    const heartsH = 100;
    drawRoundedRect(ctx, leftColX, currencyY, heartsW, heartsH, 24, "rgba(15, 15, 25, 0.42)", "rgba(244, 63, 94, 0.22)", 1);
    drawRoundedRect(ctx, leftColX + 3, currencyY + 3, heartsW - 6, heartsH - 6, 22, null, "rgba(255, 255, 255, 0.04)", 1);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#f43f5e";
    ctx.fillText("HEARTS", leftColX + 26, currencyY + 32);
    ctx.font = "bold 40px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.save();
    ctx.shadowColor = "#f43f5e88";
    ctx.shadowBlur = 14;
    ctx.fillText(formatNumber(userData.hearts || 0), leftColX + 26, currencyY + 78);
    ctx.restore();

    const cookiesX = leftColX + heartsW + 22;
    const cookiesW = 250;
    drawRoundedRect(ctx, cookiesX, currencyY, cookiesW, heartsH, 24, "rgba(15, 15, 25, 0.42)", "rgba(217, 119, 6, 0.22)", 1);
    drawRoundedRect(ctx, cookiesX + 3, currencyY + 3, cookiesW - 6, heartsH - 6, 22, null, "rgba(255, 255, 255, 0.04)", 1);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("COOKIES", cookiesX + 26, currencyY + 32);
    ctx.font = "bold 40px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.save();
    ctx.shadowColor = "#d9770688";
    ctx.shadowBlur = 14;
    ctx.fillText(formatNumber(userData.cookies || 0), cookiesX + 26, currencyY + 78);
    ctx.restore();

    const relX = cookiesX + cookiesW + 22;
    const relW = mainStatsW - (heartsW + 22 + cookiesW + 22);

    drawRoundedRect(ctx, relX, currencyY, relW, heartsH, 24, "rgba(15, 15, 25, 0.42)", "rgba(236, 72, 153, 0.22)", 1);
    drawRoundedRect(ctx, relX + 3, currencyY + 3, relW - 6, heartsH - 6, 22, null, "rgba(255, 255, 255, 0.04)", 1);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#ec4899";
    ctx.fillText("RELATIONSHIP", relX + 26, currencyY + 32);

    if (userData.marriedTo) {
      const partner = client.users.cache.get(userData.marriedTo);
      const partnerName = partner ? (partner.globalName || partner.username) : `<@${userData.marriedTo}>`;
      let dayText = "0 days together";
      if (userData.marriageSince) {
        const marrDate = new Date(userData.marriageSince);
        const diffDays = Math.max(0, Math.floor((Date.now() - marrDate.getTime()) / (1000 * 60 * 60 * 24)));
        dayText = `${diffDays} days together`;
      }
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "rgba(210, 210, 225, 0.75)";
      ctx.fillText(dayText, relX + 26, currencyY + 60);

      ctx.font = "bold 32px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.font = applyText(canvas, partnerName, 32, "sans-serif", relW - 180);
      const partW = ctx.measureText(partnerName).width;
      const centerX = relX + relW - 28 - partW / 2;
      ctx.save();
      ctx.shadowColor = "rgba(236, 72, 153, 0.5)";
      ctx.shadowBlur = 10;
      ctx.fillText(partnerName, centerX - partW / 2, currencyY + 86);
      ctx.restore();

    } else {
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "rgba(160, 160, 180, 0.6)";
      ctx.fillText("Yok", relX + 26, currencyY + 60);

      ctx.font = "bold 32px sans-serif";
      ctx.fillStyle = "rgba(170, 170, 190, 0.55)";
      const bekarW = ctx.measureText("Bekar").width;
      const centerX = relX + relW - 28 - bekarW / 2;
      ctx.fillText("Bekar", centerX - bekarW / 2, currencyY + 86);
    }

    const aboutY = currencyY + heartsH + 22;
    const aboutW = cardW - statsPadX * 2;
    const aboutH = 128;

    drawRoundedRect(ctx, leftColX, aboutY, aboutW, aboutH, 24, "rgba(15, 15, 25, 0.42)", "rgba(255, 255, 255, 0.10)", 1);
    drawRoundedRect(ctx, leftColX + 3, aboutY + 3, aboutW - 6, aboutH - 6, 22, null, "rgba(255, 255, 255, 0.04)", 1);

    const aboutLabelGrad = ctx.createLinearGradient(leftColX + 26, aboutY + 16, leftColX + 200, aboutY + 16);
    aboutLabelGrad.addColorStop(0, accent1);
    aboutLabelGrad.addColorStop(1, accent2);
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = aboutLabelGrad;
    ctx.fillText("About me", leftColX + 26, aboutY + 46);

    const aboutText = userData.about ? userData.about : " ";
    ctx.fillStyle = userData.about ? "rgba(240, 240, 255, 0.94)" : "rgba(180, 180, 200, 0.65)";
    ctx.font = applyText(canvas, aboutText, 24, "sans-serif", aboutW - 60);
    ctx.fillText(aboutText, leftColX + 26, aboutY + 90);

    const imageBuffer = await canvas.encode("png");

    return message.reply({
      files: [{ name: `profile-${target.id}.png`, attachment: imageBuffer }]
    });
  }
};
