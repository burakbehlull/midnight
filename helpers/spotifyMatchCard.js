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
  const width = 720;
  const height = 389;
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
  ctx.roundRect(0, 0, width, height, 26);
  ctx.clip();

  if (cover) {
    ctx.save();
    ctx.filter = "blur(13px) brightness(0.55)";
    ctx.globalAlpha = 0.95;
    const scale = Math.max((width + 86) / cover.width, (height + 86) / cover.height);
    const w = cover.width * scale;
    const h = cover.height * scale;
    ctx.drawImage(cover, (width - w) / 2 + 86, (height - h) / 2, w, h);
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
  ctx.roundRect(1.5, 1.5, width - 3, height - 3, 24);
  ctx.strokeStyle = withAlpha(lighten(accent, 0.3), 0.25);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#1ed760";
  ctx.beginPath();
  ctx.arc(39, 38, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(36, 41);
  ctx.lineTo(36, 34);
  ctx.moveTo(36, 41);
  ctx.arc(34.6, 41, 1.4, 0, Math.PI * 2);
  ctx.moveTo(36, 34);
  ctx.lineTo(41, 32);
  ctx.moveTo(41, 32);
  ctx.arc(39.6, 32, 1.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = accentLight;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("SPOTIFY EŞLEŞMESİ", 56, 42);

  if (guildName) {
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.textAlign = "right";
    ctx.fillText(guildName.toUpperCase(), width - 36, 42);
    ctx.textAlign = "left";
  }

  ctx.textAlign = "center";
  ctx.font = "bold 27px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(headerText, width / 2, 85);
  ctx.textAlign = "left";

  const coverSize = 144;
  const coverX = (width - coverSize) / 2;
  const coverY = 119;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 29;
  ctx.shadowOffsetY = 9;
  ctx.beginPath();
  ctx.roundRect(coverX, coverY, coverSize, coverSize, 19);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();
  ctx.restore();

  if (cover) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(coverX, coverY, coverSize, coverSize, 19);
    ctx.clip();
    ctx.drawImage(cover, coverX, coverY, coverSize, coverSize);
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = withAlpha(lighten(accent, 0.2), 0.3);
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♪", coverX + coverSize / 2, coverY + coverSize / 2);
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(coverX, coverY, coverSize, coverSize, 19);
  ctx.strokeStyle = withAlpha(lighten(accent, 0.45), 0.7);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  const heartY = coverY + coverSize + 19;
  ctx.save();
  const heartColor = withAlpha(lighten(accent, 0.4), 0.9);
  ctx.fillStyle = heartColor;
  ctx.translate(width / 2, heartY);
  const s = 8;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.5);
  ctx.bezierCurveTo(0, s * 0.1, -s, -s * 0.5, -s, -s * 0.9);
  ctx.bezierCurveTo(-s, -s * 1.3, -s * 0.5, -s * 1.5, 0, -s * 0.8);
  ctx.bezierCurveTo(s * 0.5, -s * 1.5, s, -s * 1.3, s, -s * 0.9);
  ctx.bezierCurveTo(s, -s * 0.5, 0, s * 0.1, 0, s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const avatarSize = 115;
  const user1X = 65;
  const user2X = width - 65 - avatarSize;
  const avatarY = coverY + (coverSize - avatarSize) / 2;

  function drawWave(x, y) {
    const bars = 9;
    const barW = 3.5;
    const gap = 5;
    const heights = [13, 22, 16, 29, 20, 33, 17, 26, 14];
    ctx.fillStyle = withAlpha(accent, 0.8);
    for (let i = 0; i < bars; i++) {
      const h = heights[i];
      const bx = x + i * (barW + gap);
      const by = y - h / 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, h, barW / 2);
      ctx.fill();
    }
  }

  const waveY = coverY + coverSize / 2;
  const waveW = 9 * (3.5 + 5);
  const leftSpaceStart = user1X + avatarSize;
  const leftSpaceEnd = coverX;
  const rightSpaceStart = coverX + coverSize;
  const rightSpaceEnd = user2X;
  drawWave(leftSpaceStart + (leftSpaceEnd - leftSpaceStart - waveW) / 2, waveY);
  drawWave(rightSpaceStart + (rightSpaceEnd - rightSpaceStart - waveW) / 2, waveY);

  function drawAvatarCircle(img, x, y) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#141414";
    ctx.fill();
    ctx.restore();

    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2 - 3.5, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x + 3.5, y + 3.5, avatarSize - 7, avatarSize - 7);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.restore();
  }

  drawAvatarCircle(avatar1, user1X, avatarY);
  drawAvatarCircle(avatar2, user2X, avatarY);

  ctx.textAlign = "center";
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(truncate(ctx, user1Name || "Kullanıcı", 144), user1X + avatarSize / 2, avatarY + avatarSize + 24);
  ctx.fillText(truncate(ctx, user2Name || "Kullanıcı", 144), user2X + avatarSize / 2, avatarY + avatarSize + 24);

  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(truncate(ctx, title || "Bilinmeyen Şarkı", 418), width / 2, 313);

  ctx.font = "16px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(truncate(ctx, artist || "Bilinmeyen Sanatçı", 374), width / 2, 337);

  ctx.font = "13px sans-serif";
  ctx.fillStyle = withAlpha(lighten(accent, 0.45), 0.9);
  ctx.fillText(footerText, width / 2, 364);

  ctx.textAlign = "left";

  return canvas.encode("png");
}
