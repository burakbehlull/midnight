import { createCanvas, loadImage } from "@napi-rs/canvas";

function getDominantColor(image) {
  try {
    const sampleW = 24;
    const sampleH = 24;
    const sampleCanvas = createCanvas(sampleW, sampleH);
    const sctx = sampleCanvas.getContext("2d");
    sctx.drawImage(image, 0, 0, sampleW, sampleH);

    const data = sctx.getImageData(0, 0, sampleW, sampleH).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
  } catch {
    return { r: 29, g: 185, b: 84 };
  }
}

function hex(rgb) {
  return `#${[rgb.r, rgb.g, rgb.b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function darken(rgb, amount) {
  return {
    r: Math.max(0, Math.round(rgb.r * amount)),
    g: Math.max(0, Math.round(rgb.g * amount)),
    b: Math.max(0, Math.round(rgb.b * amount)),
  };
}

function lighten(rgb, amount) {
  return {
    r: Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount)),
    g: Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount)),
    b: Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount)),
  };
}

function withAlpha(rgb, alpha) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function truncate(ctx, text, maxWidth) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "...").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "...";
}

async function safeLoadImage(url) {
  if (!url) return null;
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

export async function createSpotifyMatchCard({
  user1Name,
  user1Avatar,
  user2Name,
  user2Avatar,
  coverUrl,
  title,
  artist,
  guildName,
  footerText = "İki kişi. Tek şarkı. Aynı an.",
  headerText = "Aynı şarkıda buluştunuz."
}) {
  const width = 1000;
  const height = 540;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const [cover, avatar1, avatar2] = await Promise.all([
    safeLoadImage(coverUrl),
    safeLoadImage(user1Avatar),
    safeLoadImage(user2Avatar),
  ]);

  const accent = cover ? getDominantColor(cover) : { r: 29, g: 185, b: 84 };
  const accentHex = hex(accent);
  const accentLight = hex(lighten(accent, 0.4));

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 36);
  ctx.clip();

  if (cover) {
    ctx.save();
    ctx.filter = "blur(18px) brightness(0.55)";
    ctx.globalAlpha = 0.95;
    const scale = Math.max((width + 120) / cover.width, (height + 120) / cover.height);
    const w = cover.width * scale;
    const h = cover.height * scale;
    ctx.drawImage(cover, (width - w) / 2 + 120, (height - h) / 2, w, h);
    ctx.restore();
  }

  const bg = ctx.createLinearGradient(0, 0, width, 0);
  bg.addColorStop(0, hex(darken(accent, 0.12)));
  bg.addColorStop(0.45, hex(darken(accent, 0.16)));
  bg.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const bgV = ctx.createLinearGradient(0, 0, 0, height);
  bgV.addColorStop(0, "rgba(0,0,0,0.30)");
  bgV.addColorStop(0.5, "rgba(0,0,0,0.10)");
  bgV.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = bgV;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, width - 3, height - 3, 34);
  ctx.strokeStyle = withAlpha(lighten(accent, 0.3), 0.25);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#1ed760";
  ctx.beginPath();
  ctx.arc(54, 52, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♪", 54, 53);
  ctx.restore();

  ctx.font = "bold 17px sans-serif";
  ctx.fillStyle = accentLight;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("SPOTIFY EŞLEŞMESİ", 78, 58);

  if (guildName) {
    ctx.font = "bold 17px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.textAlign = "right";
    ctx.fillText(guildName.toUpperCase(), width - 50, 58);
    ctx.textAlign = "left";
  }

  ctx.textAlign = "center";
  ctx.font = "bold 38px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(headerText, width / 2, 118);
  ctx.textAlign = "left";

  const coverSize = 200;
  const coverX = (width - coverSize) / 2;
  const coverY = 165;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.roundRect(coverX, coverY, coverSize, coverSize, 26);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();
  ctx.restore();

  if (cover) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(coverX, coverY, coverSize, coverSize, 26);
    ctx.clip();
    ctx.drawImage(cover, coverX, coverY, coverSize, coverSize);
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(coverX, coverY, coverSize, coverSize, 26);
  ctx.strokeStyle = withAlpha(lighten(accent, 0.45), 0.7);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  const heartY = coverY + coverSize + 26;
  ctx.save();
  ctx.fillStyle = withAlpha(lighten(accent, 0.4), 0.85);
  ctx.font = "24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("♡", width / 2, heartY);
  ctx.restore();

  const avatarSize = 140;
  const user1X = coverX - 240;
  const user2X = coverX + coverSize + 100;
  const avatarY = coverY + (coverSize - avatarSize) / 2;

  function drawWave(x, y) {
    const bars = 9;
    const barW = 4;
    const gap = 7;
    ctx.fillStyle = withAlpha(accent, 0.75);
    for (let i = 0; i < bars; i++) {
      const h = 16 + Math.abs(Math.sin(i * 1.1)) * 16 + (i % 2 === 0 ? 6 : 0);
      const bx = x + i * (barW + gap);
      const by = y - h / 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, h, 2);
      ctx.fill();
    }
  }

  const waveY = coverY + coverSize / 2;
  drawWave(coverX - 115, waveY);
  drawWave(coverX + coverSize + 45, waveY);

  function drawAvatarCircle(img, x, y) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#141414";
    ctx.fill();
    ctx.restore();

    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2 - 5, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x + 5, y + 5, avatarSize - 10, avatarSize - 10);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  drawAvatarCircle(avatar1, user1X, avatarY);
  drawAvatarCircle(avatar2, user2X, avatarY);

  ctx.textAlign = "center";
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(truncate(ctx, user1Name || "Kullanıcı", 200), user1X + avatarSize / 2, avatarY + avatarSize + 34);
  ctx.fillText(truncate(ctx, user2Name || "Kullanıcı", 200), user2X + avatarSize / 2, avatarY + avatarSize + 34);

  ctx.font = "bold 34px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(truncate(ctx, title || "Bilinmeyen Şarkı", 580), width / 2, 435);

  ctx.font = "22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(truncate(ctx, artist || "Bilinmeyen Sanatçı", 520), width / 2, 468);

  ctx.font = "17px sans-serif";
  ctx.fillStyle = withAlpha(lighten(accent, 0.45), 0.9);
  ctx.fillText(footerText, width / 2, 505);

  ctx.textAlign = "left";

  return canvas.encode("png");
}
