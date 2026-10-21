import Manager from '#managers';
import { Economy } from '#models';
import { misc } from '#helpers';
import { createCanvas } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';
import gifenc from 'gifenc';

const { delay, drawRoundedRect } = misc;
const { GIFEncoder, quantize, applyPalette } = gifenc;

const MIN_BET = 50;
const MAX_BET = 50000;
const ALL_KEYWORDS = ['all', 'max', 'tüm', 'hepsi'];

const PICK_COUNT = 10;
const DRAW_COUNT = 20;
const NUMBER_MAX = 80;

const QUICK_KEYWORDS = ['rastgele', 'random', 'auto', 'hizli', 'hızlı', 'q', 'karisik', 'karışık'];

const PAYOUTS = {
  0: 0,
  1: 0,
  2: 0,
  3: 1.4,
  4: 1.9,
  5: 2,
  6: 8,
  7: 40,
  8: 250,
  9: 2000,
  10: 50000,
};
const JACKPOT_MATCH = 10;

const activeGames = new Set();

function fmt(n) {
  return Math.floor(n).toLocaleString('tr-TR');
}

function pickRandom(count) {
  const pool = Array.from({ length: NUMBER_MAX }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

const BOARD_COLS = 10;
const BOARD_ROWS = 8;
const CELL = 62;
const CELL_GAP = 8;

const TABLE_W = 820;
const TABLE_H = 800;

const SCALE = 0.7;
const IMG_W = Math.round(TABLE_W * SCALE);
const IMG_H = Math.round(TABLE_H * SCALE);
const PALETTE_SIZE = 128;

const SHUFFLE_FRAMES = 6;
const SHUFFLE_DELAY = 85;
const REVEAL_DELAY = 140;
const PULSES = 4;
const PULSE_DELAY = 170;
const HOLD_MS = 3200;

function drawKenoFrame(ctx, state) {
  const {
    picks = [], drawn = [], amount = 0,
    revealed = false, matches = 0, active = null,
    pulse = false, result = null, resultType = 'lose',
  } = state;

  const W = TABLE_W;
  const H = TABLE_H;
  const boardW = BOARD_COLS * CELL + (BOARD_COLS - 1) * CELL_GAP;
  const boardH = BOARD_ROWS * CELL + (BOARD_ROWS - 1) * CELL_GAP;
  const startX = (W - boardW) / 2;
  const startY = 150;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  ctx.save();
  const frameGrad = ctx.createLinearGradient(0, 0, 0, H);
  frameGrad.addColorStop(0, '#6d4421');
  frameGrad.addColorStop(0.5, '#8b5a2b');
  frameGrad.addColorStop(1, '#5a3716');
  drawRoundedRect(ctx, 0, 0, W, H, 24, frameGrad, '#3d2410', 4);
  ctx.restore();

  const pad = 22;
  ctx.save();
  const tableGrad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 470);
  tableGrad.addColorStop(0, '#1e7a48');
  tableGrad.addColorStop(1, '#0e4f2e');
  drawRoundedRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 18, tableGrad, '#0a3a21', 3);
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.rect(pad + 14, pad + 14, W - pad * 2 - 28, H - pad * 2 - 28);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();


  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 46px Arial Black, Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText('KENO', W / 2 + 2, 33);
  ctx.fillStyle = '#f5c842';
  ctx.fillText('KENO', W / 2, 30);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeText('KENO', W / 2, 30);
  ctx.restore();

  drawLabel(ctx, 150, 96, `BAHİS: ${fmt(amount)}`, 'rgba(15,23,42,0.9)', '#1e293b');
  const matchText = revealed
    ? `EŞLEŞME: ${matches}/${PICK_COUNT}`
    : `ÇEKİLİYOR: ${drawn.length}/${DRAW_COUNT}`;
  drawLabel(
    ctx, W - 170, 96, matchText,
    revealed ? (matches >= 5 ? '#15803d' : matches > 0 ? '#1d4ed8' : '#7f1d1d') : '#334155',
    revealed ? (matches >= 5 ? '#166534' : matches > 0 ? '#1e3a8a' : '#5b1010') : '#26334d'
  );

  const pickSet = new Set(picks);
  const drawSet = new Set(drawn);

  for (let i = 0; i < BOARD_ROWS * BOARD_COLS; i++) {
    const num = i + 1;
    const r = Math.floor(i / BOARD_COLS);
    const c = i % BOARD_COLS;
    const x = startX + c * (CELL + CELL_GAP);
    const y = startY + r * (CELL + CELL_GAP);

    const isPick = pickSet.has(num);
    const isDrawn = drawSet.has(num);
    const isActive = active === num;
    const isGlowing = isActive || (pulse && isPick && isDrawn);

    let fill = 'rgba(7,54,32,0.9)';
    let stroke = '#0b3a22';
    let textColor = '#9fc7ae';

    if (isPick && isDrawn) {
      fill = '#22c55e';
      stroke = '#bbf7d0';
      textColor = '#05230f';
    } else if (isPick) {
      fill = '#1d4ed8';
      stroke = '#93c5fd';
      textColor = '#ffffff';
    } else if (isDrawn) {
      fill = '#ca8a04';
      stroke = '#fde68a';
      textColor = '#241a02';
    }

    ctx.save();
    if (isGlowing) {
      ctx.shadowColor = isPick && isDrawn ? 'rgba(34,197,94,1)' : 'rgba(253,224,71,1)';
      ctx.shadowBlur = isActive ? 26 : 18;
    } else if (isPick && isDrawn) {
      ctx.shadowColor = 'rgba(34,197,94,0.85)';
      ctx.shadowBlur = 14;
    } else if (isDrawn) {
      ctx.shadowColor = 'rgba(202,138,4,0.6)';
      ctx.shadowBlur = 10;
    }
    drawRoundedRect(ctx, x, y, CELL, CELL, 12, fill, stroke, isPick ? 3 : 2);
    ctx.restore();

    if (isActive) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 16;
      drawRoundedRect(ctx, x - 4, y - 4, CELL + 8, CELL + 8, 16, null, '#ffffff', 4);
      ctx.restore();
    }

    ctx.fillStyle = textColor;
    ctx.font = `bold ${isPick ? 28 : 26}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), x + CELL / 2, y + CELL / 2 + 1);
  }

  if (result) {
    drawBanner(ctx, W / 2 - 320, 706, 640, result, resultType);
  }
}

function renderKenoBoard(state) {
  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx = canvas.getContext('2d');
  drawKenoFrame(ctx, state);
  return canvas.toBuffer('image/png');
}

async function buildKenoGif({ picks, drawn, amount, matches, result, resultType }) {
  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx = canvas.getContext('2d');

  const frames = [];

  // 1) Karıştırma: sayılar hızlıca yanıp söner
  for (let i = 0; i < SHUFFLE_FRAMES; i++) {
    const rand = pickRandom(DRAW_COUNT);
    frames.push({
      drawn: rand,
      active: rand[i * 3 % rand.length],
      delay: SHUFFLE_DELAY,
    });
  }

  // 2) Sayılar tek tek çekilir
  for (let i = 1; i <= drawn.length; i++) {
    frames.push({
      drawn: drawn.slice(0, i),
      active: drawn[i - 1],
      delay: REVEAL_DELAY,
    });
  }

  for (let i = 0; i < PULSES; i++) {
    frames.push({ drawn, active: null, pulse: i % 2 === 0, delay: PULSE_DELAY });
  }


  frames.push({
    drawn, active: null, revealed: true, matches, result, resultType,
    delay: HOLD_MS,
  });

  const spinMs = frames.reduce((a, f) => a + f.delay, 0);

  const last = frames[frames.length - 1];
  drawKenoFrame(ctx, { picks, amount, ...last });
  const palette = quantize(ctx.getImageData(0, 0, IMG_W, IMG_H).data, PALETTE_SIZE, { format: 'rgb565' });

  const gif = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
    drawKenoFrame(ctx, { picks, amount, ...fr });
    const index = applyPalette(ctx.getImageData(0, 0, IMG_W, IMG_H).data, palette, 'rgb565');
    gif.writeFrame(index, IMG_W, IMG_H, i === 0
      ? { palette, delay: fr.delay, repeat: -1 }
      : { delay: fr.delay });
    if (i % 4 === 0) await delay(0);
  }
  gif.finish();

  return { buffer: Buffer.from(gif.bytes()), spinMs };
}

function drawLabel(ctx, cx, y, text, fill, stroke) {
  ctx.save();
  ctx.font = 'bold 19px Arial';
  const w = Math.max(ctx.measureText(text).width + 44, 150);
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  drawRoundedRect(ctx, cx - w / 2, y, w, 42, 21, fill, stroke, 2);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + 22);
}

function drawBanner(ctx, x, y, width, text, type = 'win') {
  const palette = {
    win:   { fill: '#2e7d32', stroke: '#1b5e20', glow: '#4caf50', text: '#ffffff' },
    lose:  { fill: '#c62828', stroke: '#8b0000', glow: '#f44336', text: '#ffffff' },
    push:  { fill: '#f9a825', stroke: '#f57f17', glow: '#ffeb3b', text: '#1a1a1a' },
    jack:  { fill: '#6d28d9', stroke: '#a78bfa', glow: '#c4b5fd', text: '#ffffff' },
  };
  const p = palette[type] || palette.lose;
  const h = 68;

  ctx.save();
  ctx.shadowColor = p.glow;
  ctx.shadowBlur = 18;
  drawRoundedRect(ctx, x, y, width, h, 14, p.fill, p.stroke, 3);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  drawRoundedRect(ctx, x + 4, y + 4, width - 8, h / 2 - 2, 10);
  ctx.restore();

  ctx.fillStyle = p.text;
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + h / 2 + 2);
}

function kenoAttachment(state) {
  return new AttachmentBuilder(renderKenoBoard(state), { name: 'keno.png' });
}


export default {
  name: 'keno',
  category: 'games',
  aliases: ['k'],
  usage: '.keno <bahis|all> <10 sayı>  |  .keno <bahis|all> rastgele',
  description: 'Keno! 1-80 arasından 10 sayı seç, sistem 20 sayı çeker. Ne kadar çok eşleşme, o kadar büyük ödül (10 eşleşme = dev jackpot).',
  permissions: { enabled: false },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;

    if (!args[0]) {
      return manager.sender.reply(manager.sender.errorEmbed(
        '**Kullanım:**\n' +
        '`.keno 500 3 7 15 22 41 55 60 66 72`\n' +
        '`.keno 500 3,7,15,22,41,55,60,66,72,80`\n' +
        '`.keno 500 rastgele` → bot senin için 10 sayı seçer\n' +
        '`.keno all rastgele` → tüm bakiyenle oyna'
      ));
    }

    if (activeGames.has(userId)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Zaten aktif bir Keno oyunun var. Önce onu bitir!'));
    }

    let userData = await Economy.findOne({ userId });
    if (!userData) {
      userData = new Economy({ userId });
      await userData.save().catch(() => {});
    }

    const rawBet = String(args[0]).toLowerCase().trim();
    const isAll = ALL_KEYWORDS.includes(rawBet);
    let amount;

    if (isAll) {
      const balance = userData.money ?? 0;
      if (balance < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(
          `❌ All modu için bakiyen minimum **${fmt(MIN_BET)}** coin olmalı. Mevcut: **${fmt(balance)}** coin`
        ));
      }
      amount = Math.min(balance, MAX_BET);
    } else {
      amount = parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir bahis belirt. Örn: `.keno 500 rastgele`'));
      }
      if (amount < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Minimum bahis **${fmt(MIN_BET)}** coin.`));
      }
      if (amount > MAX_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Maksimum bahis **${fmt(MAX_BET)}** coin.`));
      }
    }

    if ((userData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Yeterli coin yok. Gereken: **${fmt(amount)}** coin.`));
    }

    const restRaw = args.slice(1).join(' ').toLowerCase().trim();
    let picks;

    if (!restRaw || QUICK_KEYWORDS.includes(restRaw)) {
      picks = pickRandom(PICK_COUNT);
    } else {
      const tokens = restRaw.split(/[,\s]+/).filter(Boolean);
      const parsed = [];
      for (const t of tokens) {
        const n = parseInt(t);
        if (isNaN(n)) {
          return manager.sender.reply(manager.sender.errorEmbed(
            `❌ Geçersiz sayı: \`${t}\`\nSayıları boşluk veya virgülle ayır: \`.keno 500 1 5 9 12 20 33 44 55 66 77\``
          ));
        }
        parsed.push(n);
      }

      if (parsed.length !== PICK_COUNT) {
        return manager.sender.reply(manager.sender.errorEmbed(
          `❌ Tam **${PICK_COUNT}** sayı seçmelisin. Şu an **${parsed.length}** sayı verdin.\nÖrnek: \`.keno 500 1 5 9 12 20 33 44 55 66 77\``
        ));
      }
      if (parsed.some((n) => n < 1 || n > NUMBER_MAX)) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Sayılar **1 - ${NUMBER_MAX}** arasında olmalı.`));
      }
      const uniq = new Set(parsed);
      if (uniq.size !== PICK_COUNT) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Aynı sayıyı birden fazla seçemezsin.'));
      }
      picks = [...uniq].sort((a, b) => a - b);
    }

    try {
      await Economy.findOneAndUpdate(
        { userId },
        { $inc: { money: -amount } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } catch (e) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bahis çekimi sırasında hata oluştu.'));
    }

    activeGames.add(userId);

    const refund = async () => {
      try { await Economy.findOneAndUpdate({ userId }, { $inc: { money: amount } }, {}); } catch (_) {}
    };

    try {
      const drawn = pickRandom(DRAW_COUNT);
      const pickSet = new Set(picks);
      const matches = drawn.filter((n) => pickSet.has(n)).length;
      const mult = PAYOUTS[matches] ?? 0;
      const payout = Math.floor(amount * mult);
      const isJackpot = matches >= JACKPOT_MATCH && payout > 0;
      const won = payout > amount;
      const xpGain = won ? 12 : 3;

      let resultText = null;
      let resultType = 'lose';
      if (isJackpot) {
        resultText = `JACKPOT! 10/10 • +${fmt(payout)}`;
        resultType = 'jack';
      } else if (won) {
        resultText = `KAZANDIN! ${matches}/${PICK_COUNT} • +${fmt(payout - amount)}`;
        resultType = 'win';
      } else if (payout > 0) {
        resultText = `BERABERE • ${matches}/${PICK_COUNT} • +${fmt(payout - amount)}`;
        resultType = 'push';
      } else {
        resultText = `KAYBETTİN! ${matches}/${PICK_COUNT} • -${fmt(amount)}`;
        resultType = 'lose';
      }

      const legend = '🔵 Seçtiğin sayılar • 🟠 Çekilen sayılar • 🟢 Tutan sayılar';
      const picksText = picks.map((n) => String(n).padStart(2, '0')).join(' ');
      const content =
        `<@${userId}> **KENO** • Bahis: **${fmt(amount)}** coin\n` +
        `${legend}\n` +
        `Seçimin: \`${picksText}\``;

      // Animasyonlu çekiliş GIF'i
      let gifBuffer = null;
      let spinMs = 0;
      try {
        const built = await buildKenoGif({
          picks, drawn, amount, matches,
          result: resultText, resultType,
        });
        gifBuffer = built.buffer;
        spinMs = built.spinMs;
      } catch (e) {
        console.error('[keno] GIF oluşturulamadı:', e?.message || e);
      }

      const resultEmbed = (balance) => manager.sender.embed({
        color: isJackpot
          ? manager.sender.colors.purple
          : resultType === 'win' ? manager.sender.colors.green
            : resultType === 'push' ? manager.sender.colors.orange
              : manager.sender.colors.liveRed,
        title: isJackpot
          ? 'KENO — JACKPOT!'
          : won ? '🎉 KENO — KAZANDIN!'
            : resultType === 'push' ? '😐 KENO — BERABERE'
              : 'KENO — KAYBETTİN',
        description:
          `💰 Bahis: **${fmt(amount)}** coin\n` +
          `Eşleşme: **${matches}/${PICK_COUNT}**\n` +
          `Ödeme: **${payout > 0 ? `+${fmt(payout)}` : '0'}** coin\n` +
          `Bakiye: **${fmt(balance)}** coin\n\n` +
          `${resultText}\n\n` +
          `Seçimin: \`${picksText}\`\n` +
          `${legend}`,
        image: 'attachment://keno.gif',
        footer: { text: 'Keno • 1-80 arası 10 sayı, 20 sayı çekilir' },
      });

      const spinEmbed = manager.sender.embed({
        color: manager.sender.colors.purple,
        title: '🎯 KENO — ÇEKİLİŞ',
        description:
          `Bahis: **${fmt(amount)}** coin\n` +
          `Seçimin: \`${picksText}\`\n` +
          `**${DRAW_COUNT}** sayı çekiliyor...\n\n` +
          `${legend}`,
        image: 'attachment://keno.gif',
        footer: { text: 'Keno • 1-80 arası 10 sayı, 20 sayı çekilir' },
      });

      let gameMsg = null;
      let usedGif = false;

      if (gifBuffer) {
        try {
          gameMsg = await message.channel.send({
            content,
            embeds: [spinEmbed],
            files: [new AttachmentBuilder(gifBuffer, { name: 'keno.gif' })],
          });
          usedGif = true;
        } catch (e) {
          console.error('[keno] GIF mesajı gönderilemedi:', e?.message || e);
        }
      }

      if (!gameMsg) {
        try {
          gameMsg = await message.channel.send({
            content,
            files: [kenoAttachment({
              picks, drawn, amount,
              revealed: true, matches, payout,
              result: resultText, resultType,
            })],
          });
        } catch (e) {
          console.error('[keno] Tahta gönderilemedi:', e?.message || e);
        }
      }

      if (!gameMsg) {
        try {
          const latest = await Economy.findOne({ userId }).catch(() => null);
          gameMsg = await message.channel.send({
            embeds: [buildTextEmbed(manager, { picks, drawn, matches, amount, payout, resultText, resultType, balance: latest?.money ?? 0, jackpot: isJackpot })],
          });
        } catch (e2) {
          console.error('[keno] Mesaj gönderilemedi:', e2?.message || e2);
          await refund();
          try { await manager.sender.reply(manager.sender.errorEmbed('❌ Oyun gösterilemedi. Bahsin iade edildi.')); } catch (_) {}
          return;
        }
      }

      if (payout > 0 || xpGain > 0) {
        try {
          await Economy.findOneAndUpdate(
            { userId },
            { $inc: { money: payout, xp: xpGain } },
            { new: true }
          );
        } catch (e) {
          console.error('[keno] Ödeme hatası:', e);
        }
      }

      const latest = await Economy.findOne({ userId }).catch(() => null);
      const balance = latest?.money ?? 0;

      if (usedGif) {
        await delay(spinMs);
        try {
          await gameMsg.edit({ embeds: [resultEmbed(balance)] });
        } catch (e) {
          console.error('[keno] Sonuç embed güncellenemedi:', e?.message || e);
        }
      }
    } finally {
      activeGames.delete(userId);
    }
  },
};

function buildTextEmbed(manager, { picks, drawn, matches, amount, payout, resultText, resultType, balance, jackpot }) {
  const pad = (n) => String(n).padStart(2, '0');
  const pickSet = new Set(picks);
  const lines = [];

  for (let r = 0; r < BOARD_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BOARD_COLS; c++) {
      const n = r * BOARD_COLS + c + 1;
      const hit = drawn.includes(n) && pickSet.has(n);
      row.push(`${hit ? '✅' : pickSet.has(n) ? '🔵' : drawn.includes(n) ? '🟠' : '⬛'}${pad(n)}`);
    }
    lines.push(row.join(' '));
  }

  const color = jackpot
    ? manager.sender.colors.purple
    : resultType === 'win' ? manager.sender.colors.green
      : resultType === 'push' ? manager.sender.colors.orange
        : manager.sender.colors.liveRed;

  return manager.sender.embed({
    color,
    title: jackpot ? 'KENO — JACKPOT!' : 'KENO SONUCU',
    description:
      `Bahis: **${fmt(amount)}** coin\n` +
      `Eşleşme: **${matches}/${PICK_COUNT}**\n` +
      `Ödeme: **${payout > 0 ? `+${fmt(payout)}` : '0'}** coin\n` +
      `Bakiye: **${fmt(balance)}** coin\n\n` +
      `${resultText}\n\n` +
      `${lines.join('\n')}\n\n` +
      `🔵 Seçimin • 🟠 Çekilen • ✅ Tutan`,
    footer: { text: 'Keno • 1-80 arası 10 sayı, 20 sayı çekilir' },
  });
}
