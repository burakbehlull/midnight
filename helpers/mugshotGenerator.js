import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';


const MUGSHOT_TEMPLATE = resolve(process.cwd(), 'assets', 'mugshot.png');
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 559;


function drawCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  ctx.drawImage(
    image,
    sourceX, sourceY, sourceWidth, sourceHeight,
    x, y, width, height,
  );
}


function drawFittedText(ctx, text, x, y, maxWidth, initialFontSize = 26) {
  let fontSize = initialFontSize;
  let output = String(text);

  ctx.textAlign = 'left';
  while (fontSize > 14) {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    if (ctx.measureText(output).width <= maxWidth) break;
    fontSize--;
  }

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  while (output.length > 1 && ctx.measureText(output).width > maxWidth) {
    output = `${output.slice(0, -2)}…`;
  }

  ctx.fillText(output, x, y);
}

/**
 * Mahkum fotoğrafı (mugshot) oluşturur.
 * 
 * @param {Object} options - Mugshot ayarları
 * @param {User} options.user - Discord kullanıcısı
 * @param {string} options.userId - Kullanıcı ID'si
 * @param {string} options.title - Başlık (örn: "BAN KAYDI" veya sunucu adı)
 * @param {Object} options.fields - Tabela üzerindeki bilgiler
 * @param {string} options.fields.name - Kullanıcı adı
 * @param {string} options.fields.id - Kullanıcı ID'si
 * @param {string} options.fields.recordId - Ceza numarası (opsiyonel)
 * @param {string} [options.fileName='mugshot.png'] - Oluşturulacak dosya adı
 * @returns {Promise<AttachmentBuilder>} Discord attachment
 */
async function createMugshot({
  user,
  userId,
  title,
  fields = {},
  fileName = 'mugshot.png'
}) {
 
  const templateBuffer = readFileSync(MUGSHOT_TEMPLATE);
  const template = await loadImage(templateBuffer);
  const canvas = createCanvas(IMAGE_WIDTH, IMAGE_HEIGHT);
  const ctx = canvas.getContext('2d');


  ctx.drawImage(template, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  
  try {
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });
    const avatar = await loadImage(avatarUrl);
    const faceWidth = 250;
    const faceHeight = 250;
    const faceX = 387;
    const faceY = 25;

    const faceCanvas = createCanvas(faceWidth, faceHeight);
    const faceCtx = faceCanvas.getContext('2d');
    drawCover(faceCtx, avatar, 0, 0, faceWidth, faceHeight);

   
    faceCtx.globalCompositeOperation = 'destination-in';
    faceCtx.save();
    faceCtx.translate(faceWidth / 2, faceHeight / 2);

    const mask = faceCtx.createRadialGradient(
      0, 0, faceWidth * 0.45,
      0, 0, faceWidth * 0.50,
    );
    mask.addColorStop(0, 'rgba(0, 0, 0, 1)');
    mask.addColorStop(1, 'rgba(0, 0, 0, 0)');

    faceCtx.fillStyle = mask;
    faceCtx.fillRect(-faceWidth / 2, -faceHeight / 2, faceWidth, faceHeight);
    faceCtx.restore();
    faceCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(faceCanvas, faceX, faceY);
  } catch (error) {
    console.error('[mugshot] Avatar yüklenemedi:', error);
  }

 
  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(345, 285, 368, 214);

  
  const titleUpper = (title || 'KAYIT').toLocaleUpperCase('tr-TR');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px Arial, sans-serif';
  ctx.fillText(titleUpper, 529, 318);


  ctx.fillStyle = '#d74b4b';
  ctx.fillRect(367, 331, 322, 2);


  const name = fields.name || user.username.toLocaleUpperCase('tr-TR');
  const id = fields.id || userId;
  const recordId = fields.recordId;

  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, `AD: ${name}`, 367, 369, 322, 26);
  drawFittedText(ctx, `ID: ${id}`, 367, 417, 322, 24);

  ctx.fillStyle = '#ff7777';
  drawFittedText(
    ctx,
    `CEZA NO: ${recordId == null ? 'KAYIT YOK' : `#${recordId}`}`,
    367, 465, 322, 25,
  );

 
  const buffer = await canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: fileName });
}

export { createMugshot };
