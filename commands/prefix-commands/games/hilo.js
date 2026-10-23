import Manager from '#managers';
import { Economy } from '#models';
import { Button, misc } from '#helpers';
import { createCanvas } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

const { delay, drawRoundedRect } = misc;

const MIN_BET = 50;
const MAX_BET = 50000;
const ALL_KEYWORDS = ['all', 'max', 'tüm', 'hepsi'];
const HOUSE_EDGE = 0.95;
const MAX_MULT = 100;
const ROUND_TIME = 60000;
const activeGames = new Set();

const TABLE_W = 920;
const TABLE_H = 560;
const CARD_W = 168;
const CARD_H = 236;

const SUIT_COLORS = { s: '#1f2430', c: '#1f2430', h: '#d32f2f', d: '#d32f2f' };
const RANK_LABELS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function rankLabel(rank) {
  return RANK_LABELS[rank] || String(rank);
}

function fmt(n) {
  return Math.floor(n).toLocaleString('tr-TR');
}

function drawRandomCard() {
  const keys = Object.keys(SUIT_COLORS);
  return {
    rank: 1 + Math.floor(Math.random() * 13),
    suit: keys[Math.floor(Math.random() * keys.length)]
  };
}

function higherChance(rank) {
  return (13 - rank) / 13;
}

function lowerChance(rank) {
  return (rank - 1) / 13;
}

function stepMultiplier(rank, guess) {
  const chance = guess === 'up' ? higherChance(rank) : lowerChance(rank);
  if (chance <= 0) return 0;
  return HOUSE_EDGE / chance;
}

/* ============================== CANVAS ============================== */

function drawSuit(ctx, suit, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const cx = x + w / 2;

  if (suit === 'd') {
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(cx, y + h);
    ctx.lineTo(x, y + h / 2);
    ctx.closePath();
    ctx.fill();
  } else if (suit === 'h') {
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.98);
    ctx.bezierCurveTo(x - w * 0.12, y + h * 0.60, x + w * 0.16, y - h * 0.06, cx, y + h * 0.28);
    ctx.bezierCurveTo(x + w * 0.84, y - h * 0.06, x + w * 1.12, y + h * 0.60, cx, y + h * 0.98);
    ctx.closePath();
    ctx.fill();
  } else if (suit === 's') {
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.bezierCurveTo(x + w * 1.15, y + h * 0.45, x + w * 0.86, y + h * 0.92, cx, y + h * 0.68);
    ctx.bezierCurveTo(x + w * 0.14, y + h * 0.92, x - w * 0.15, y + h * 0.45, cx, y);
    ctx.closePath();
    ctx.moveTo(cx, y + h * 0.60);
    ctx.lineTo(x + w * 0.28, y + h);
    ctx.lineTo(x + w * 0.72, y + h);
    ctx.closePath();
    ctx.fill();
  } else {
    const r = w * 0.27;
    ctx.beginPath();
    ctx.moveTo(cx + r, y + h * 0.30);
    ctx.arc(cx, y + h * 0.30, r, 0, Math.PI * 2);
    ctx.moveTo(x + w * 0.26 + r, y + h * 0.62);
    ctx.arc(x + w * 0.26, y + h * 0.62, r, 0, Math.PI * 2);
    ctx.moveTo(x + w * 0.74 + r, y + h * 0.62);
    ctx.arc(x + w * 0.74, y + h * 0.62, r, 0, Math.PI * 2);
    ctx.moveTo(cx, y + h * 0.66);
    ctx.lineTo(x + w * 0.32, y + h);
    ctx.lineTo(x + w * 0.68, y + h);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawCardFace(ctx, x, y, w, h, card) {
  const color = SUIT_COLORS[card.suit] || '#1f2430';
  const radius = 14;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 9;
  const face = ctx.createLinearGradient(x, y, x, y + h);
  face.addColorStop(0, '#ffffff');
  face.addColorStop(1, '#e6e6e6');
  drawRoundedRect(ctx, x, y, w, h, radius, face, '#bfbfbf', 2);
  ctx.restore();

  ctx.save();
  const gloss = ctx.createLinearGradient(x, y, x, y + h * 0.55);
  gloss.addColorStop(0, 'rgba(255,255,255,0.95)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  drawRoundedRect(ctx, x + w * 0.07, y + h * 0.05, w * 0.86, h * 0.42, radius * 0.7, gloss);
  ctx.restore();

  const label = rankLabel(card.rank);
  const cornerScale = w * 0.26;

  const corner = (ox, oy) => {
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(cornerScale)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, ox, oy);
    drawSuit(ctx, card.suit, ox - cornerScale * 0.36, oy + cornerScale * 1.16, cornerScale * 0.72, cornerScale * 0.72, color);
  };

  ctx.save();
  corner(x + w * 0.17, y + h * 0.055);
  ctx.restore();

  ctx.save();
  ctx.translate(x + w * 0.83, y + h * 0.945);
  ctx.rotate(Math.PI);
  corner(0, 0);
  ctx.restore();

  drawSuit(ctx, card.suit, x + w * 0.22, y + h * 0.30, w * 0.56, h * 0.42, color);
}

function drawCardBack(ctx, x, y, w, h) {
  const radius = 14;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 9;
  const back = ctx.createLinearGradient(x, y, x + w, y + h);
  back.addColorStop(0, '#26407a');
  back.addColorStop(1, '#111c38');
  drawRoundedRect(ctx, x, y, w, h, radius, back, '#0b1226', 3);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 6;
  for (let i = -h; i < w + h; i += 18) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, x + 10, y + 10, w - 20, h - 20, radius - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, w * 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(245,200,66,0.85)';
  ctx.font = `bold ${Math.floor(w * 0.30)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + w / 2, y + h / 2 + 2);
  ctx.restore();
}

function drawCard(ctx, x, y, w, h, card, opts = {}) {
  if (opts.hidden || !card) {
    drawCardBack(ctx, x, y, w, h);
    return;
  }
  drawCardFace(ctx, x, y, w, h, card);
}

function drawPill(ctx, cx, y, text, fill, stroke, opts = {}) {
  const { height = 42, fontSize = 20, color = '#ffffff' } = opts;
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial`;
  const w = Math.max(ctx.measureText(text).width + 46, 132);
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  drawRoundedRect(ctx, cx - w / 2, y, w, height, height / 2, fill, stroke, 2);
  ctx.restore();

  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + height / 2 + 1);
}

function drawBanner(ctx, x, y, width, text, type = 'win') {
  const palette = {
    win:  { fill: '#2e7d32', stroke: '#1b5e20', glow: '#4caf50', text: '#ffffff' },
    lose: { fill: '#c62828', stroke: '#8b0000', glow: '#f44336', text: '#ffffff' },
    cash: { fill: '#f9a825', stroke: '#f57f17', glow: '#ffeb3b', text: '#1a1a1a' }
  };
  const p = palette[type] || palette.lose;
  const h = 64;

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
  ctx.font = 'bold 29px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + h / 2 + 2);
}

function renderHilo(state) {
  const {
    amount = 0, mult = 1, payout = 0, streak = 0,
    current = null, next = null, nextHidden = true,
    status = null, result = null, resultType = 'lose'
  } = state;

  const W = TABLE_W;
  const H = TABLE_H;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.save();
  const frameGrad = ctx.createLinearGradient(0, 0, 0, H);
  frameGrad.addColorStop(0, '#6d4421');
  frameGrad.addColorStop(0.5, '#8b5a2b');
  frameGrad.addColorStop(1, '#5a3716');
  drawRoundedRect(ctx, 0, 0, W, H, 24, frameGrad, '#3d2410', 4);
  ctx.restore();

  const pad = 22;
  ctx.save();
  const tableGrad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 540);
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
  ctx.font = 'bold 44px Arial Black, Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText('HILO', W / 2 + 2, 42);
  ctx.fillStyle = '#f5c842';
  ctx.fillText('HILO', W / 2, 39);
  ctx.restore();

  drawPill(ctx, 155, 34, `BAHİS: ${fmt(amount)}`, 'rgba(15,23,42,0.9)', '#1e293b', { fontSize: 19 });
  drawPill(
    ctx, W - 160, 34, `ÇARPAN: ${mult.toFixed(2)}x`,
    mult > 1 ? '#1d4ed8' : 'rgba(15,23,42,0.9)',
    mult > 1 ? '#1e3a8a' : '#1e293b',
    { fontSize: 19 }
  );

  const gap = 152;
  const cardY = 112;
  const curX = W / 2 - gap / 2 - CARD_W;
  const nextX = W / 2 + gap / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(234,255,242,0.85)';
  ctx.font = 'bold 17px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AÇIK KART', curX + CARD_W / 2, cardY - 15);
  ctx.fillText('SIRADAKİ', nextX + CARD_W / 2, cardY - 15);
  ctx.restore();

  drawCard(ctx, curX, cardY, CARD_W, CARD_H, current);
  drawCard(ctx, nextX, cardY, CARD_W, CARD_H, next, { hidden: nextHidden });

  const arrowY = cardY + CARD_H / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(245,200,66,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 24, arrowY - 20);
  ctx.lineTo(W / 2 + 26, arrowY);
  ctx.lineTo(W / 2 - 24, arrowY + 20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (status) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fillText(status, W / 2, 376);
    ctx.restore();
  }

  drawPill(ctx, W / 2 - 175, 398, `SERİ: ${streak}`, 'rgba(15,23,42,0.9)', '#1e293b', { fontSize: 18 });
  drawPill(
    ctx, W / 2 + 175, 398, `POTANSİYEL: ${fmt(payout)}`,
    payout > amount ? '#166534' : 'rgba(15,23,42,0.9)',
    payout > amount ? '#14532d' : '#1e293b',
    { fontSize: 18 }
  );

  if (result) drawBanner(ctx, W / 2 - 330, 462, 660, result, resultType);

  return canvas.toBuffer('image/png');
}

function hiloAttachment(state) {
  return new AttachmentBuilder(renderHilo(state), { name: 'hilo.png' });
}


export default {
  name: 'hilo',
  category: 'games',
  aliases: ['yukseklik', 'yukseldus', 'yd', 'hilo', 'highlow'],
  usage: '.hilo <bahis|all>',
  description: 'HiLo! Sıradaki kartın yüksek mi düşük mü geleceğini tahmin et. Her doğru tahmin çarpanı büyütür, yanlışta her şeyi kaybedersin. İstediğin an çekilebilirsin.',
  permissions: { enabled: false },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;

    const betArg = args.find((a) => !/^<@!?\d+>$/.test(a));

    if (!betArg) {
      return manager.sender.reply(manager.sender.errorEmbed(
        '❌ Bahis miktarı belirt. Örnek: `.hilo 500` veya `.hilo all`'
      ));
    }

    if (activeGames.has(userId)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Zaten aktif bir HiLo oyunun var. Önce onu bitir!'));
    }

    let userData = await Economy.findOne({ userId });
    if (!userData) {
      userData = new Economy({ userId });
      await userData.save().catch(() => {});
    }

    const rawBet = String(betArg).toLowerCase().trim();
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
      amount = parseInt(betArg);
      if (isNaN(amount) || amount <= 0) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir bahis miktarı belirt. Örn: `.hilo 500`'));
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

    return runGame(client, message, manager, { userId, amount });
  }
};



async function runGame(client, message, manager, { userId, amount }) {
  activeGames.add(userId);

  let charged = false;
  let resolved = false;

  const refund = async () => {
    if (!charged) return;
    charged = false;
    try { await Economy.findOneAndUpdate({ userId }, { $inc: { money: amount } }); } catch (_) {}
  };

  try {
    try {
      await Economy.findOneAndUpdate(
        { userId },
        { $inc: { money: -amount } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      charged = true;
    } catch (e) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bahis çekimi sırasında hata oluştu.'));
    }

    const st = {
      amount,
      current: drawRandomCard(),
      next: null,
      nextHidden: true,
      mult: 1,
      streak: 0,
      payout: amount,
      status: 'Tahmin et: sıradaki kart daha YÜKSEK mi, DÜŞÜK mü gelecek?'
    };

    const upId = `hilo_up_${userId}`;
    const downId = `hilo_down_${userId}`;
    const cashId = `hilo_cash_${userId}`;

    const buildRow = () => {
      const b = new Button();
      b.add(upId, 'Yüksek', b.style.Success, '⬆️', st.current.rank >= 13);
      b.add(downId, 'Düşük', b.style.Primary, '⬇️', st.current.rank <= 1);
      b.add(cashId, `Çekil ${st.mult.toFixed(2)}x`, b.style.Secondary, '💰', false);
      return b.build();
    };

    const header = () =>
      `<@${userId}> **HILO** • Bahis: **${fmt(amount)}** coin • Çarpan: **${st.mult.toFixed(2)}x**`;

    const frame = (extra = {}) => hiloAttachment({ ...st, payout: Math.floor(amount * st.mult), ...extra });

    let gameMsg;
    try {
      gameMsg = await message.channel.send({
        content: header(),
        files: [frame()],
        components: [buildRow()]
      });
    } catch (e) {
      console.error('[hilo] Mesaj gönderilemedi:', e?.message || e);
      await refund();
      try {
        await manager.sender.reply(manager.sender.errorEmbed('❌ Oyun başlatılamadı. Bahsin iade edildi.'));
      } catch (_) {}
      return;
    }

    const finish = async ({ payout, banner, resultType, status, extraFrame = {} }) => {
      st.status = status;
      st.payout = payout;
      charged = false;

      if (payout > 0) {
        try {
          await Economy.findOneAndUpdate(
            { userId },
            { $inc: { money: payout, xp: payout > amount ? 12 : 2 } },
            { new: true }
          );
        } catch (e) {
          console.error('[hilo] Ödeme hatası:', e);
        }
      } else {
        try { await Economy.findOneAndUpdate({ userId }, { $inc: { xp: 2 } }, { new: true }); } catch (_) {}
      }

      const latest = await Economy.findOne({ userId }).catch(() => null);
      const net = payout - amount;
      const resultEmbed = manager.sender.embed({
        color: resultType === 'lose' ? manager.sender.colors.liveRed : manager.sender.colors.green,
        title: resultType === 'lose' ? '💸 Kaybettin' : '💰 Çekildin',
        description:
          `${resultType === 'lose' ? '❌ Yanlış tahmin.' : '✅ Doğru tahminlerle çekildin.'}\n` +
          `Çarpan: **${st.mult.toFixed(2)}x**\n` +
          `Seri: **${st.streak}**\n` +
          `${net >= 0 ? 'Kazanç' : 'Kayıp'}: **${net >= 0 ? '+' : ''}${fmt(net)}** coin\n` +
          `Yeni Bakiye: **${fmt(latest?.money ?? 0)}** coin`,
        footer: { text: ' ' }
      });

      try {
        await gameMsg.edit({
          content: header(),
          embeds: [resultEmbed],
          files: [frame({ result: banner, resultType, ...extraFrame })],
          components: []
        });
      } catch (e) {
        console.error('[hilo] Sonuç görseli gönderilemedi:', e?.message || e);
      }
    };

    const collector = gameMsg.createMessageComponentCollector({ idle: ROUND_TIME });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ Bu oyun senin değil. Kendi oyununu `.hilo <bahis>` ile başlatabilirsin.',
          ephemeral: true
        }).catch(() => {});
      }

      if (resolved) return;

      try { await interaction.deferUpdate(); } catch (_) {}

      if (interaction.customId === cashId) {
        resolved = true;
        try { collector.stop('cashed'); } catch (_) {}
        const payout = Math.floor(amount * st.mult);
        await finish({
          payout,
          banner: `ÇEKİLDİN! +${fmt(payout - amount)}`,
          resultType: 'cash',
          status: `Elini kapattın. Çarpan ${st.mult.toFixed(2)}x`
        });
        return;
      }

      const guess = interaction.customId === upId ? 'up' : 'down';
      const rolled = drawRandomCard();
      const step = stepMultiplier(st.current.rank, guess);
      const won = guess === 'up' ? rolled.rank > st.current.rank : rolled.rank < st.current.rank;

      // Kart açılış animasyonu
      st.next = rolled;
      st.nextHidden = true;
      st.status = guess === 'up' ? 'Yüksek tahmin edildi, kart açılıyor...' : 'Düşük tahmin edildi, kart açılıyor...';
      try {
        await gameMsg.edit({ content: header(), files: [frame()], components: [] });
      } catch (_) {}
      await delay(1100);

      if (!won) {
        resolved = true;
        try { collector.stop('lost'); } catch (_) {}
        await finish({
          payout: 0,
          banner: `KAYBETTİN! -${fmt(amount)}`,
          resultType: 'lose',
          status: `${rankLabel(st.current.rank)} üzerine ${guess === 'up' ? 'yüksek' : 'düşük'} dedin, ${rankLabel(rolled.rank)} geldi.`,
          extraFrame: { nextHidden: false }
        });
        return;
      }

      st.current = rolled;
      st.next = null;
      st.nextHidden = true;
      st.streak += 1;
      st.mult = Math.min(st.mult * step, MAX_MULT);
      st.status =
        st.mult >= MAX_MULT
          ? `Doğru! Çarpan üst sınıra ulaştı: ${st.mult.toFixed(2)}x`
          : `Doğru! Çarpan ${st.mult.toFixed(2)}x • Devam edebilir veya çekilebilirsin.`;

      try {
        await gameMsg.edit({ content: header(), files: [frame()], components: [buildRow()] });
      } catch (e) {
        console.error('[hilo] Tur güncellenemedi:', e?.message || e);
      }
    });

    collector.on('end', async (_, reason) => {
      if (resolved) return;
      resolved = true;

      const payout = Math.floor(amount * st.mult);
      await finish({
        payout,
        banner: `SÜRE DOLDU! +${fmt(payout - amount)}`,
        resultType: 'cash',
        status: `Süre doldu, otomatik çekildin. Çarpan ${st.mult.toFixed(2)}x`
      });
    });

    await new Promise((resolve) => collector.once('end', resolve));
  } finally {
    activeGames.delete(userId);
    await refund();
  }
}
