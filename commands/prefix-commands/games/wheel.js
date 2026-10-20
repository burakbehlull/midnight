import Manager from '#managers';
import { Economy } from '#models';
import { misc } from '#helpers';
import { AttachmentBuilder } from 'discord.js';
import { createCanvas } from '@napi-rs/canvas';
import gifenc from 'gifenc';

const { delay } = misc;
const { GIFEncoder, quantize, applyPalette } = gifenc;

const MIN_BET = 50;
const MAX_BET = 50000;
const ALL_KEYWORDS = ['all', 'max', 'tüm', 'hepsi'];

const SPIN_FRAMES = 18;
const SPINS = 3;
const PULSES = 4;
const HOLD_MS = 2600;

const RISK_ALIASES = {
  dusuk: 'dusuk', 'düşük': 'dusuk', low: 'dusuk', d: 'dusuk', 1: 'dusuk',
  orta: 'orta', medium: 'orta', normal: 'orta', o: 'orta', 2: 'orta',
  yuksek: 'yuksek', 'yüksek': 'yuksek', high: 'yuksek', h: 'yuksek', y: 'yuksek', 3: 'yuksek',
};


const RISKS = {
  dusuk: {
    label: 'Düşük',
    emoji: '🟢',
    desc: 'Sık küçük kazanç, düşük risk',
    color: 'mintGreen',
    counts: [
      [0, 13], [0.5, 4], [1.2, 6], [1.5, 4], [2, 2], [3, 2], [5, 1],
    ], 
  },
  orta: {
    label: 'Orta',
    emoji: '🟡',
    desc: 'Dengeli kazanç ve risk',
    color: 'orange',
    counts: [
      [0, 19], [0.5, 2], [1.2, 4], [1.5, 2], [2, 2], [3, 1], [5, 1], [10, 1],
    ],
  },
  yuksek: {
    label: 'Yüksek',
    emoji: '🔴',
    desc: 'Nadir ama dev kazanç (25x)',
    color: 'liveRed',
    counts: [
      [0, 24], [0.5, 4], [1, 2], [1.5, 1], [25, 1],
    ],
  },
};


const MULT_COLORS = {
  0: { bg: '#2b2f3a', fg: '#8b95a7' },
  0.5: { bg: '#5a6478', fg: '#ffffff' },
  1: { bg: '#4D96FF', fg: '#ffffff' },
  1.2: { bg: '#3AB0FF', fg: '#0a2740' },
  1.5: { bg: '#00C9A7', fg: '#04352c' },
  2: { bg: '#6BCB77', fg: '#0b2e14' },
  3: { bg: '#FFD93D', fg: '#3d3202' },
  5: { bg: '#FF9F45', fg: '#3d2200' },
  10: { bg: '#C780FA', fg: '#ffffff' },
  25: { bg: '#FF4D4D', fg: '#ffffff' },
};

function colorFor(mult) {
  return MULT_COLORS[mult] ?? { bg: '#8892B0', fg: '#ffffff' };
}

const DS_W = 560;
const DS_H = 600;
const CX = DS_W / 2;
const CY = 262;
const R = 195;

const SCALE = 0.86;
const IMG_W = Math.round(DS_W * SCALE);
const IMG_H = Math.round(DS_H * SCALE);

const PALETTE_SIZE = 128;

const activeGames = new Set();

function buildWheel(counts) {
  const arr = [];
  for (const [mult, count] of counts) {
    for (let i = 0; i < count; i++) arr.push(mult);
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fmtMult(m) {
  return `${Number(m)}x`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWheelFrame(ctx, { wheel, rotation, risk, amount, highlight = false, banner = false, winnerIdx = -1, payout = 0, net = 0 }) {
  const L = wheel.length;
  const seg = (Math.PI * 2) / L;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  const bg = ctx.createLinearGradient(0, 0, 0, DS_H);
  bg.addColorStop(0, '#161a27');
  bg.addColorStop(1, '#0a0d14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, DS_W, DS_H);

  ctx.beginPath();
  ctx.arc(CX, CY, R + 13, 0, Math.PI * 2);
  const rimGrad = ctx.createLinearGradient(CX - R, CY - R, CX + R, CY + R);
  rimGrad.addColorStop(0, '#7c5f18');
  rimGrad.addColorStop(0.45, '#ffe37a');
  rimGrad.addColorStop(0.7, '#c9a227');
  rimGrad.addColorStop(1, '#6b5213');
  ctx.lineWidth = 16;
  ctx.strokeStyle = rimGrad;
  ctx.stroke();

  for (let i = 0; i < L; i++) {
    const a0 = rotation + i * seg;
    const a1 = a0 + seg;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = colorFor(wheel[i]).bg;
    ctx.fill();
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  for (let i = 0; i < L; i++) {
    const a = rotation + i * seg;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
    ctx.stroke();
  }

  const shade = ctx.createRadialGradient(CX, CY, R * 0.12, CX, CY, R);
  shade.addColorStop(0, 'rgba(0,0,0,0.45)');
  shade.addColorStop(0.55, 'rgba(0,0,0,0.05)');
  shade.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fillStyle = shade;
  ctx.fill();

  if (highlight && winnerIdx >= 0) {
    const a0 = rotation + winnerIdx * seg;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, a0, a0 + seg);
    ctx.closePath();
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < L; i++) {
    const mid = rotation + i * seg + seg / 2;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(mid);
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = colorFor(wheel[i]).fg;
    ctx.fillText(fmtMult(wheel[i]), R * 0.72, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(CX, CY, 58, 0, Math.PI * 2);
  const hub = ctx.createRadialGradient(CX - 20, CY - 20, 4, CX, CY, 58);
  hub.addColorStop(0, '#3d4358');
  hub.addColorStop(1, '#11141d');
  ctx.fillStyle = hub;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,217,61,0.75)';
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(risk.label.toUpperCase(), CX, CY - 13);
  ctx.fillStyle = '#ffd93d';
  ctx.font = 'bold 13px Arial';
  ctx.fillText(amount.toLocaleString('tr-TR'), CX, CY + 12);

  for (let i = 0; i < 32; i++) {
    const a = (Math.PI * 2 / 32) * i - Math.PI / 2;
    const bx = CX + Math.cos(a) * (R + 27);
    const by = CY + Math.sin(a) * (R + 27);
    ctx.beginPath();
    ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? '#ffe37a' : '#4a4326';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(CX - 20, 6);
  ctx.lineTo(CX + 20, 6);
  ctx.lineTo(CX, 54);
  ctx.closePath();
  const ptr = ctx.createLinearGradient(CX, 6, CX, 54);
  ptr.addColorStop(0, '#fff6c2');
  ptr.addColorStop(1, '#e0a800');
  ctx.fillStyle = ptr;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#4a3b00';
  ctx.stroke();

  if (banner) {
    const lose = payout <= 0;
    const accent = lose ? '#FF6B6B' : payout >= amount * 5 ? '#FFD93D' : '#6BCB77';

    roundRectPath(ctx, 40, 500, DS_W - 80, 66, 16);
    const bar = ctx.createLinearGradient(0, 500, 0, 566);
    bar.addColorStop(0, 'rgba(28,33,48,0.96)');
    bar.addColorStop(1, 'rgba(12,15,22,0.96)');
    ctx.fillStyle = bar;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = accent;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = 'bold 26px Arial';
    ctx.fillText(
      lose ? `${fmtMult(wheel[winnerIdx])} • KAYIP` : `${fmtMult(wheel[winnerIdx])} • +${payout.toLocaleString('tr-TR')} coin`,
      CX, 525
    );

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(
      lose ? `-${amount.toLocaleString('tr-TR')} coin` : `NET ${net >= 0 ? '+' : ''}${net.toLocaleString('tr-TR')} coin`,
      CX, 551
    );
  }
}

async function buildWheelGif({ wheel, risk, amount, winnerIdx, payout, net, targetRotation }) {
  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx = canvas.getContext('2d');

  const spinMs = Array.from({ length: SPIN_FRAMES }, (_, i) => Math.round(52 + 120 * ((i + 1) / SPIN_FRAMES)))
    .reduce((a, b) => a + b, 0);

  const frames = [];
  for (let f = 1; f <= SPIN_FRAMES; f++) {
    const p = f / SPIN_FRAMES;
    const eased = 1 - Math.pow(1 - p, 3);
    frames.push({
      rotation: f === SPIN_FRAMES ? targetRotation : targetRotation * eased,
      delay: Math.round(52 + 120 * p),
      highlight: false,
      banner: false
    });
  }
  for (let i = 0; i < PULSES; i++) {
    frames.push({ rotation: targetRotation, delay: 170, highlight: i % 2 === 0, banner: true });
  }
  frames.push({ rotation: targetRotation, delay: HOLD_MS, highlight: true, banner: true });

  drawWheelFrame(ctx, {
    wheel, rotation: targetRotation, risk, amount,
    highlight: true, banner: true, winnerIdx, payout, net
  });
  const palette = quantize(ctx.getImageData(0, 0, IMG_W, IMG_H).data, PALETTE_SIZE, { format: 'rgb565' });

  const gif = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
    drawWheelFrame(ctx, {
      wheel, rotation: fr.rotation, risk, amount,
      highlight: fr.highlight, banner: fr.banner, winnerIdx, payout, net
    });
    const index = applyPalette(ctx.getImageData(0, 0, IMG_W, IMG_H).data, palette, 'rgb565');
    gif.writeFrame(index, IMG_W, IMG_H, i === 0
      ? { palette, delay: fr.delay, repeat: -1 }
      : { delay: fr.delay });
    if (i % 4 === 0) await delay(0); 
  }
  gif.finish();

  return { buffer: Buffer.from(gif.bytes()), spinMs };
}

export default {
  name: 'cark',
  category: 'games',
  aliases: ['carkifelek', 'carkıfelek', 'wheel'],
  usage: '.cark <bahisMiktarı|all> [düşük|orta|yüksek]',
  description: 'Çark-ı Felek! Bahis + risk seviyesi seç, animasyonlu çark dönsün, gelen dilimin çarpanını al.',
  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;

    if (activeGames.has(userId)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Zaten dönen bir çarkın var, bitmesini bekle!'));
    }

    const rawArg = (args[0] || '').toString().toLowerCase().trim();
    const isAll = ALL_KEYWORDS.includes(rawArg);

    const rawRisk = (args[1] || '').toString().toLowerCase().trim();
    let riskKey = 'orta';
    if (rawRisk) {
      const mapped = RISK_ALIASES[rawRisk];
      if (!mapped) {
        return manager.sender.reply(manager.sender.errorEmbed(
          '❌ Geçersiz risk seviyesi. Seçenekler: `düşük`, `orta`, `yüksek`.\nKullanım: `.cark 500 orta`'
        ));
      }
      riskKey = mapped;
    }
    const risk = RISKS[riskKey];

    let userData = await Economy.findOne({ userId });
    if (!userData) {
      userData = new Economy({ userId });
      await userData.save().catch(() => {});
    }

    let amount;
    if (isAll) {
      const balance = userData.money ?? 0;
      if (balance < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(
          `❌ All modu için bakiyen minimum **${MIN_BET.toLocaleString('tr-TR')}** coin olmalı. Mevcut: **${balance.toLocaleString('tr-TR')}** coin`
        ));
      }
      amount = Math.min(balance, MAX_BET);
    } else {
      amount = parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir bahis miktarı belirt. Kullanım: `.cark 500` veya `.cark all`'));
      }
      if (amount < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Minimum bahis miktarı **${MIN_BET.toLocaleString('tr-TR')}** coin.`));
      }
      if (amount > MAX_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Maksimum bahis miktarı **${MAX_BET.toLocaleString('tr-TR')}** coin.`));
      }
    }

    if ((userData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Yeterli coin yok. Gereken: **${amount.toLocaleString('tr-TR')}** coin.`));
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

    const refund = async () => {
      try { await Economy.findOneAndUpdate({ userId }, { $inc: { money: amount } }); } catch (_) {}
    };

    activeGames.add(userId);
    try {
      const wheel = buildWheel(risk.counts);
      const L = wheel.length;
      const seg = (Math.PI * 2) / L;
      const winnerIdx = Math.floor(Math.random() * L);
      const mult = wheel[winnerIdx];

      const targetRotation = Math.PI * 2 * SPINS + (-Math.PI / 2 - (winnerIdx * seg + seg / 2));

      const payout = Math.floor(amount * mult);
      const net = payout - amount;
      const xpGain = Math.max(2, Math.min(50, Math.round(mult * 2)));

      let gifBuffer;
      let spinMs;
      try {
        const result = await buildWheelGif({ wheel, risk, amount, winnerIdx, payout, net, targetRotation });
        gifBuffer = result.buffer;
        spinMs = result.spinMs;
      } catch (e) {
        console.error('[cark] GIF oluşturulamadı:', e?.message || e);
        await refund();
        return manager.sender.reply(manager.sender.errorEmbed('❌ Çark görseli oluşturulamadı. Bahsin iade edildi.'));
      }

      const legend = risk.counts.map(([m, c]) => `${fmtMult(m)}×${c}`).join(' • ');
      const buildEmbed = ({ color, title, text, footer }) => manager.sender.embed({
        color: color ?? manager.sender.colors[risk.color] ?? manager.sender.colors.purple,
        title: title ?? '🎡 ÇARK-I FELEK',
        description:
          `${risk.emoji} **Risk:** ${risk.label} — ${risk.desc}\n` +
          `💰 **Bahis:** ${amount.toLocaleString('tr-TR')} coin\n` +
          `🎰 **Dilimler:** ${legend}\n\n` +
          (text ?? '🎯 Çark dönüyor...'),
        image: 'attachment://cark.gif',
        footer: { text: footer ?? 'Dilim ne gelirse onu alırsın!' }
      });

      let spinMsg;
      try {
        spinMsg = await message.channel.send({
          embeds: [buildEmbed({})],
          files: [new AttachmentBuilder(gifBuffer, { name: 'cark.gif' })]
        });
      } catch (e) {
        console.error('[cark] Mesaj gönderilemedi:', e?.message || e);
        await refund();
        try {
          await manager.sender.reply(manager.sender.errorEmbed('❌ Oyun mesajı gönderilemedi. Bahsin iade edildi.'));
        } catch (_) {}
        return;
      }

      if (payout > 0) {
        try {
          await Economy.findOneAndUpdate({ userId }, { $inc: { money: payout, xp: xpGain } }, { new: true });
        } catch (e) {
          console.error('[cark] Ödeme hatası:', e);
        }
      }

      let title;
      let color;
      if (mult === 0) {
        title = '💸 KAYBETTİN';
        color = manager.sender.colors.liveRed;
      } else if (mult >= 10) {
        title = '👑 JACKPOT!';
        color = manager.sender.colors.gold;
      } else if (mult >= 5) {
        title = '🌟 BÜYÜK KAZANÇ!';
        color = manager.sender.colors.purple;
      } else if (net >= 0) {
        title = '🎉 KAZANDIN!';
        color = manager.sender.colors.green;
      } else {
        title = '😐 KÜÇÜK KAYIP';
        color = manager.sender.colors.orange;
      }

      const plus = net >= 0 ? '+' : '';
      const resultText = mult === 0
        ? `Çark **0x** diliminde durdu! Bu dilim boş, bahsini kaybettin.\n**Kayıp:** ${net.toLocaleString('tr-TR')} coin`
        : `Çark **${fmtMult(mult)}** diliminde durdu!\n` +
          `**Kazanç:** +${payout.toLocaleString('tr-TR')} coin  •  **NET:** ${plus}${net.toLocaleString('tr-TR')} coin  •  **XP:** +${xpGain}`;

      await delay(spinMs);
      let latest;
      try { latest = await Economy.findOne({ userId }); } catch (_) {}
      try {
        await spinMsg.edit({
          embeds: [buildEmbed({
            color, title, text: resultText,
            footer: `Bakiye: ${(latest?.money ?? 0).toLocaleString('tr-TR')} coin`
          })]
        });
      } catch (e) {
        console.error('[cark] Sonuç embed güncellenemedi:', e?.message || e);
      }
    } finally {
      activeGames.delete(userId);
    }
  },
};
