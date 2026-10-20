import Manager from '#managers';
import { Economy } from '#models';
import { Button, misc } from '#helpers';
import { createCanvas } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

const { delay, drawRoundedRect } = misc;

const MIN_BET = 50;
const MAX_BET = 50000;
const ALL_KEYWORDS = ['all', 'max', 'tüm', 'hepsi'];

const OVER_MULT = 2.28;

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const MODE_ALIASES = {
  ust: 'ust', 'üst': 'ust', yuksek: 'ust', 'yüksek': 'ust', over: 'ust',
  up: 'ust', u: 'ust', y: 'ust', yukari: 'ust', 'yukarı': 'ust',
  alt: 'alt', asagi: 'alt', 'aşağı': 'alt', dusuk: 'alt', 'düşük': 'alt',
  under: 'alt', low: 'alt', down: 'alt', a: 'alt', d: 'alt',
};

const activeGames = new Set();

function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

function rollTwo() {
  const a = rollDie();
  const b = rollDie();
  return { a, b, sum: a + b };
}

function diceStr(a, b) {
  return `${DICE_FACES[a - 1]} ${DICE_FACES[b - 1]}`;
}

function fmt(n) {
  return Math.floor(n).toLocaleString('tr-TR');
}

function modeLabel(mode) {
  return mode === 'ust' ? '7 ÜSTÜ' : '7 ALTI';
}

function modeEmoji(mode) {
  return mode === 'ust' ? '⬆️' : '⬇️';
}


const TABLE_W = 920;
const TABLE_H = 560;

function truncate(str, n) {
  const s = String(str ?? '');
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function drawDie(ctx, x, y, size, value, opts = {}) {
  const { hidden = false, accent = '#9aa0a6' } = opts;
  const radius = size * 0.16;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, hidden ? '#e6e6e6' : '#ffffff');
  grad.addColorStop(1, hidden ? '#bcbcbc' : '#e2e2e2');
  drawRoundedRect(ctx, x, y, size, size, radius, grad, accent, 3);
  ctx.restore();

  ctx.save();
  const gloss = ctx.createLinearGradient(x, y, x, y + size * 0.55);
  gloss.addColorStop(0, 'rgba(255,255,255,0.9)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  drawRoundedRect(ctx, x + size * 0.08, y + size * 0.06, size * 0.84, size * 0.44, radius * 0.7, gloss);
  ctx.restore();

  if (hidden) {
    ctx.fillStyle = '#8a8f98';
    ctx.font = `bold ${Math.floor(size * 0.5)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + size / 2, y + size / 2 + size * 0.02);
    return;
  }

  const pipR = size * 0.072;
  const L = x + size * 0.27;
  const C = x + size * 0.5;
  const R = x + size * 0.73;
  const T = y + size * 0.27;
  const M = y + size * 0.5;
  const B = y + size * 0.73;

  const layouts = {
    1: [[C, M]],
    2: [[L, T], [R, B]],
    3: [[L, T], [C, M], [R, B]],
    4: [[L, T], [R, T], [L, B], [R, B]],
    5: [[L, T], [R, T], [C, M], [L, B], [R, B]],
    6: [[L, T], [R, T], [L, M], [R, M], [L, B], [R, B]],
  };
  const pips = layouts[value] || layouts[1];

  for (const [px, py] of pips) {
    ctx.beginPath();
    ctx.arc(px, py + pipR * 0.16, pipR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, pipR, 0, Math.PI * 2);
    ctx.fillStyle = value === 1 ? '#d32f2f' : '#1f2430';
    ctx.fill();

    const shine = ctx.createRadialGradient(
      px - pipR * 0.35, py - pipR * 0.35, pipR * 0.1,
      px, py, pipR
    );
    shine.addColorStop(0, 'rgba(255,255,255,0.6)');
    shine.addColorStop(0.65, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(px, py, pipR, 0, Math.PI * 2);
    ctx.fillStyle = shine;
    ctx.fill();
  }
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
    win:   { fill: '#2e7d32', stroke: '#1b5e20', glow: '#4caf50', text: '#ffffff' },
    lose:  { fill: '#c62828', stroke: '#8b0000', glow: '#f44336', text: '#ffffff' },
    push:  { fill: '#f9a825', stroke: '#f57f17', glow: '#ffeb3b', text: '#1a1a1a' },
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

function renderDiceTable(state) {
  const {
    mode = 'solo', amount = 0, pool = 0,
    solo = null, p1 = null, p2 = null,
    revealed = { p1: true, p2: true },
    status = null, result = null, resultType = 'lose',
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
  const tableGrad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 520);
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

  const title = mode === 'solo' ? 'ZAR OYUNU' : 'ZAR DÜELLOSU';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 44px Arial Black, Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText(title, W / 2 + 2, 43);
  ctx.fillStyle = '#f5c842';
  ctx.fillText(title, W / 2, 40);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeText(title, W / 2, 40);
  ctx.restore();

  drawPill(ctx, 150, 36, `BAHİS: ${fmt(amount)}`, 'rgba(15,23,42,0.9)', '#1e293b', { fontSize: 19 });
  if (mode === 'solo') {
    drawPill(ctx, W - 150, 36, solo?.bet === 'ust' ? '7 ÜSTÜ' : '7 ALTI', '#1d4ed8', '#1e3a8a', { fontSize: 19 });
  } else {
    drawPill(ctx, W - 155, 36, `HAVUZ: ${fmt(pool)}`, '#6d28d9', '#4c1d95', { fontSize: 19 });
  }

  if (mode === 'solo') {
    const roll = solo || { a: 1, b: 1, sum: 2 };
    const size = 150;
    const gap = 34;
    const totalW = size * 2 + gap;
    const sx = W / 2 - totalW / 2;
    const sy = 170;

    if (roll.name) {
      ctx.fillStyle = '#eafff2';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(truncate(roll.name, 20), W / 2, 142);
    }

    drawDie(ctx, sx, sy, size, roll.a, { hidden: !!state.hidden });
    drawDie(ctx, sx + size + gap, sy, size, roll.b, { hidden: !!state.hidden });

    const sumFill = resultType === 'win' ? '#2e7d32' : resultType === 'lose' ? '#c62828' : '#1d4ed8';
    const sumStroke = resultType === 'win' ? '#1b5e20' : resultType === 'lose' ? '#8b0000' : '#1e3a8a';
    drawPill(ctx, W / 2, sy + size + 22, `TOPLAM: ${roll.sum}`, sumFill, sumStroke, { height: 46, fontSize: 24 });

    if (status) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.fillText(status, W / 2, 396);
      ctx.restore();
    }

    if (result) drawBanner(ctx, W / 2 - 320, 424, 640, result, resultType);
  } else {
    const size = 120;
    const gap = 26;
    const diceY = 190;
    const leftCx = 250;
    const rightCx = W - 250;

    const drawSide = (cx, roll, isRevealed, fill, stroke) => {
      const r = roll || { a: 1, b: 1, sum: 0 };
      drawPill(ctx, cx, 126, truncate(r.name, 14), fill, stroke, { height: 38, fontSize: 18 });

      const totalW = size * 2 + gap;
      const sx = cx - totalW / 2;
      drawDie(ctx, sx, diceY, size, r.a, { hidden: !isRevealed });
      drawDie(ctx, sx + size + gap, diceY, size, r.b, { hidden: !isRevealed });

      drawPill(ctx, cx, diceY + size + 22, isRevealed ? `TOPLAM: ${r.sum}` : 'TOPLAM: ?', fill, stroke, { height: 42, fontSize: 21 });
    };

    drawSide(leftCx, p1, revealed.p1, '#1d4ed8', '#1e3a8a');
    drawSide(rightCx, p2, revealed.p2, '#b91c1c', '#7f1d1d');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 46px Arial Black, Arial';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText('VS', W / 2 + 2, diceY + size / 2 + 3);
    ctx.fillStyle = '#f5c842';
    ctx.fillText('VS', W / 2, diceY + size / 2);
    ctx.restore();

    if (status) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 23px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.fillText(status, W / 2, 386);
      ctx.restore();
    }

    if (result) drawBanner(ctx, W / 2 - 330, 420, 660, result, resultType);
  }

  return canvas.toBuffer('image/png');
}

function diceAttachment(state) {
  return new AttachmentBuilder(renderDiceTable(state), { name: 'dice.png' });
}

export default {
  name: 'dice',
  category: 'games',
  aliases: ['zar', 'zarduellosu', 'zardüellosu', 'zarduello', 'zd'],
  usage: '.zar <bahis|all> <üst|alt>  |  .zar @kişi <bahis>',
  description: 'Zar Düellosu! İki zarın toplamını 7 üstü/7 altı tahmin et. Birini etiketlersen bahisli düello başlar (yüksek atan havuzu alır).',
  permissions: { enabled: false },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const challenger = message.author;

    let target = null;
    const mention = message.mentions?.users?.first() || null;
    const positional = args.filter((a) => !/^<@!?\d+>$/.test(a));

    if (mention) {
      target = mention;
    } else if (args[0] && /^<@!?\d+>$/.test(args[0])) {
      const uid = args[0].match(/^<@!?(\d+)>$/)?.[1];
      if (uid) {
        target = await client.users.fetch(uid).catch(() => null) || client.users.cache.get(uid) || null;
      }
    }

    const betArg = positional[0];
    const modeArg = positional[1];

    if (!betArg) {
      return manager.sender.reply(manager.sender.errorEmbed(
        '**Tek Kişilik:** `.zar 500 üst` veya `.zar all alt`\n' +
        '**2 Kişilik:** `.zar @Kullanıcı 1000`'
      ));
    }

    if (target) {
      if (target.bot) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Botlarla zar düellosu oynanmaz.'));
      }
      if (target.id === challenger.id) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Kendinle oynayamazsın.'));
      }
    }

    if (activeGames.has(challenger.id)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Zaten aktif bir zar oyunun var. Önce onu bitir!'));
    }
    if (target && activeGames.has(target.id)) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ <@${target.id}> şu an başka bir oyunda. Lütfen bekle.`));
    }

    let mode = null;
    if (!target) {
      const rawMode = String(modeArg || '').toLowerCase().trim();
      if (!rawMode) {
        return manager.sender.reply(manager.sender.errorEmbed(
          '❌ Tahmin belirt: `üst` (7 üstü) veya `alt` (7 altı).\nÖrnek: `.zar 500 üst`'
        ));
      }
      mode = MODE_ALIASES[rawMode];
      if (!mode) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Geçersiz tahmin. Seçenekler: `üst` veya `alt`.'));
      }
    }

    let userData = await Economy.findOne({ userId: challenger.id });
    if (!userData) {
      userData = new Economy({ userId: challenger.id });
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
        return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir bahis miktarı belirt. Örn: `.zar 500 üst` veya `.zar all alt`'));
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

    if (target) {
      return runTwoPlayer(client, message, manager, { challenger, target, amount });
    }
    return runSinglePlayer(client, message, manager, { userId: challenger.id, amount, mode });
  },
};

/* ============================ TEK KİŞİLİK ============================ */

async function runSinglePlayer(client, message, manager, { userId, amount, mode }) {
  activeGames.add(userId);
  let charged = false;
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

    const buildEmbed = (o = {}) => manager.sender.embed({
      color: o.color ?? manager.sender.colors.blue,
      title: o.title ?? '🎲 ZAR DÜELLOSU',
      description:
        `🎮 Oyuncu: <@${userId}>\n` +
        `💰 Bahis: **${fmt(amount)}** coin\n` +
        `${modeEmoji(mode)} Tahmin: **${modeLabel(mode)}**\n\n` +
        (o.text ?? '🎲 Zarlar atılıyor...'),
      footer: { text: `Çarpan: ${OVER_MULT}x • 7 gelirse kaybedersin` }
    });


    const roll = rollTwo();
    const won = mode === 'ust' ? roll.sum > 7 : roll.sum < 7;
    const isSeven = roll.sum === 7;
    const payout = won ? Math.floor(amount * OVER_MULT) : 0;
    const net = payout - amount;
    const xpGain = won ? 10 : 2;

    if (payout > 0) {
      try {
        await Economy.findOneAndUpdate({ userId }, { $inc: { money: payout, xp: xpGain } }, { new: true });
      } catch (e) {
        console.error('[zar] Ödeme hatası:', e);
      }
    } else {
      try { await Economy.findOneAndUpdate({ userId }, { $inc: { xp: xpGain } }, { new: true }); } catch (_) {}
    }
    charged = false;

    const latest = await Economy.findOne({ userId }).catch(() => null);
    const balanceLine = `💼 Yeni Bakiye: **${fmt(latest?.money ?? 0)}** coin`;
    const rollLine = `🎲 **${diceStr(roll.a, roll.b)} = ${roll.sum}**`;

    let title, color, text;
    if (isSeven) {
      title = '😈 7 GELDİ! KAYBETTİN';
      color = manager.sender.colors.liveRed;
      text =
        `${rollLine}\n` +
        `${modeEmoji(mode)} Tahmin: **${modeLabel(mode)}**\n\n` +
        '😈 Toplam tam **7** geldi! 7 üstü de altı da kaybeder.\n' +
        `💸 Kayıp: **-${fmt(amount)}** coin\n` +
        balanceLine;
    } else if (won) {
      title = '🎉 KAZANDIN!';
      color = manager.sender.colors.green;
      text =
        `${rollLine}\n` +
        `${modeEmoji(mode)} Tahmin: **${modeLabel(mode)}**\n\n` +
        `✅ **${roll.sum}**, ${mode === 'ust' ? "7'den büyük" : "7'den küçük"} — doğru tahmin!\n` +
        `🎯 Çarpan: **${OVER_MULT}x**\n` +
        `💸 Kazanç: **+${fmt(payout)}** coin\n` +
        `📊 NET: **+${fmt(net)}** coin • ✨ XP: +${xpGain}\n` +
        balanceLine;
    } else {
      title = '💸 KAYBETTİN';
      color = manager.sender.colors.liveRed;
      text =
        `${rollLine}\n` +
        `${modeEmoji(mode)} Tahmin: **${modeLabel(mode)}**\n\n` +
        `❌ **${roll.sum}** tahminine uymadı.\n` +
        `💸 Kayıp: **-${fmt(amount)}** coin\n` +
        balanceLine;
    }

    const bannerText = isSeven
      ? `7 GELDİ! -${fmt(amount)}`
      : won
        ? `KAZANDIN! +${fmt(net)}`
        : `KAYBETTİN! -${fmt(amount)}`;

    let sent = false;
    try {
      await message.channel.send({
        content: `🎲 <@${userId}> **ZAR OYUNU** • Bahis: **${fmt(amount)}** coin • Tahmin: **${modeLabel(mode)}**`,
        files: [diceAttachment({
          mode: 'solo',
          amount,
          solo: { a: roll.a, b: roll.b, sum: roll.sum, bet: mode, name: message.author.username },
          result: bannerText,
          resultType: isSeven ? 'lose' : won ? 'win' : 'lose',
        })]
      });
      sent = true;
    } catch (e) {
      console.error('[zar] Resimli gönderim başarısız, metne düşülüyor:', e?.message || e);
    }

    if (!sent) {
      try {
        await message.channel.send({ embeds: [buildEmbed({ color, title, text })] });
        sent = true;
      } catch (_) {}
    }

    if (!sent) {
      try { await Economy.findOneAndUpdate({ userId }, { $inc: { money: amount - payout } }, {}); } catch (_) {}
      try { await manager.sender.reply(manager.sender.errorEmbed('❌ Oyun sonucu gösterilemedi. Bahsin iade edildi.')); } catch (_) {}
    }
  } finally {
    activeGames.delete(userId);
  }
}

/* ============================ 2 KİŞİLİK ============================ */

async function runTwoPlayer(client, message, manager, { challenger, target, amount }) {
  const targetData = await Economy.findOne({ userId: target.id }).catch(() => null);
  const targetBalance = targetData?.money ?? 0;
  if (targetBalance < amount) {
    return manager.sender.reply(manager.sender.errorEmbed(
      `❌ <@${target.id}> yeterli coin'e sahip değil.\nGereken: **${fmt(amount)}** coin • Mevcut: **${fmt(targetBalance)}** coin`
    ));
  }

  const nonce = Date.now();
  const acceptId = `zd_${nonce}_accept`;
  const rejectId = `zd_${nonce}_reject`;

  const buttonBuilder = new Button();
  buttonBuilder.add(acceptId, '✅ Kabul Et', buttonBuilder.style.Success);
  buttonBuilder.add(rejectId, '❌ Reddet', buttonBuilder.style.Danger);

  let offerMsg;
  try {
    offerMsg = await message.channel.send({
      embeds: [manager.sender.embed({
        color: manager.sender.colors.purple,
        title: '🎲 ZAR DÜELLOSU TEKLİFİ',
        description:
          `<@${challenger.id}>, <@${target.id}> rakibine **${fmt(amount)}** coinlik zar düellosu teklif etti!\n\n` +
          `🎁 Havuz: **${fmt(amount * 2)}** coin (yüksek atan hepsini alır)\n` +
          '🎲 Her oyuncu 2 zar atar\n' +
          '⏳ Onay için **30 saniyen** var.',
        footer: { text: 'Yüksek atan kazanır • Beraberlikte iade' }
      })],
      components: [buttonBuilder.build()]
    });
  } catch (e) {
    console.error('[zar-2p] Teklif mesajı gönderilemedi:', e?.message || e);
    return;
  }

  activeGames.add(challenger.id);
  activeGames.add(target.id);

  const cleanup = () => {
    activeGames.delete(challenger.id);
    activeGames.delete(target.id);
  };

  let resolved = false;
  const offerCollector = offerMsg.createMessageComponentCollector({ time: 30000 });

  offerCollector.on('collect', async (interaction) => {
    if (interaction.user.id !== target.id) {
      return interaction.reply({
        content: '❌ Bu teklifi sadece etiketlenen kişi yanıtlayabilir.',
        ephemeral: true
      }).catch(() => {});
    }

    try { await interaction.deferUpdate(); } catch (_) {}
    if (resolved) return;
    resolved = true;
    try { offerCollector.stop('answered'); } catch (_) {}

    if (interaction.customId === rejectId) {
      cleanup();
      await offerMsg.edit({
        embeds: [manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '❌ Teklif Reddedildi',
          description: `<@${target.id}> zar düellosu teklifini reddetti.`,
          footer: { text: ' ' }
        })],
        components: []
      }).catch(() => {});
      return;
    }

    if (interaction.customId !== acceptId) return;

    const dec1 = await Economy.findOneAndUpdate(
      { userId: challenger.id },
      { $inc: { money: -amount } },
      { new: true }
    ).catch(() => null);
    const dec2 = await Economy.findOneAndUpdate(
      { userId: target.id },
      { $inc: { money: -amount } },
      { new: true }
    ).catch(() => null);

    if (!dec1 || !dec2 || (dec1.money ?? -1) < 0 || (dec2.money ?? -1) < 0) {
      if (dec1 && (dec1.money ?? -1) >= 0) {
        try { await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: amount } }, {}); } catch (_) {}
      }
      if (dec2 && (dec2.money ?? -1) >= 0) {
        try { await Economy.findOneAndUpdate({ userId: target.id }, { $inc: { money: amount } }, {}); } catch (_) {}
      }
      cleanup();
      await offerMsg.edit({
        embeds: [manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '❌ İşlem Başarısız',
          description: 'Bakiye çekiminde sorun oluştu. Tekrar deneyin.',
          footer: { text: ' ' }
        })],
        components: []
      }).catch(() => {});
      return;
    }

    await waitRoll({ manager, offerMsg, challenger, target, amount, cleanup });
  });

  offerCollector.on('end', async (_, reason) => {
    if (resolved) return;
    cleanup();
    if (reason === 'time') {
      await offerMsg.edit({
        embeds: [manager.sender.embed({
          color: manager.sender.colors.orange,
          title: '⏳ Teklif Süresi Doldu',
          description: `<@${target.id}> 30 saniye içinde onay vermedi. Teklif iptal edildi.`,
          footer: { text: ' ' }
        })],
        components: []
      }).catch(() => {});
    }
  });
}

async function waitRoll({ manager, offerMsg, challenger, target, amount, cleanup }) {
  const pool = amount * 2;
  const rollId = `zd_${Date.now()}_roll`;

  const buttonBuilder = new Button();
  buttonBuilder.add(rollId, '🎲 Zar At', buttonBuilder.style.Primary);

  const readyContent =
    `<@${challenger.id}> ⚔️ <@${target.id}>\n` +
    '👉 Zarları atmak için **🎲 Zar At** butonuna basın. **60 saniyeniz** var.';

  // Masa görseliyle "zar at" ekranı
  let imageOk = true;
  try {
    await offerMsg.edit({
      content: readyContent,
      embeds: [],
      files: [diceAttachment({
        mode: 'duel',
        amount,
        pool,
        p1: { name: challenger.username },
        p2: { name: target.username },
        revealed: { p1: false, p2: false },
        status: 'Zarlar atılmaya hazır!',
      })],
      components: [buttonBuilder.build()]
    });
  } catch (e) {
    imageOk = false;
    console.error('[zar-2p] Masa görseli gönderilemedi:', e?.message || e);
  }

  if (!imageOk) {
    await offerMsg.edit({
      embeds: [manager.sender.embed({
        color: manager.sender.colors.purple,
        title: '🎲 ZAR DÜELLOSU',
        description:
          `🟦 <@${challenger.id}> hazır!\n` +
          `🟥 <@${target.id}> hazır!\n\n` +
          '👉 Zarları atmak için **🎲 Zar At** butonuna basın.\n' +
          '⏳ Buton için **60 saniyeniz** var.\n\n' +
          `💰 Havuz: **${fmt(pool)}** coin`,
        footer: { text: `Kişi başı bahis: ${fmt(amount)} coin` }
      })],
      components: [buttonBuilder.build()]
    }).catch(() => {});
  }

  let rolled = false;
  const collector = offerMsg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== challenger.id && interaction.user.id !== target.id) {
      return interaction.reply({
        content: '❌ Bu düellonun zarlarını sadece oyuncular atabilir.',
        ephemeral: true
      }).catch(() => {});
    }

    if (rolled) return;
    rolled = true;
    try { await interaction.deferUpdate(); } catch (_) {}
    try { collector.stop('rolled'); } catch (_) {}

    await startDuel({ manager, offerMsg, challenger, target, amount, cleanup });
  });

  collector.on('end', async (_, reason) => {
    if (rolled) return;
    rolled = true;

    try { await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: amount } }, {}); } catch (_) {}
    try { await Economy.findOneAndUpdate({ userId: target.id }, { $inc: { money: amount } }, {}); } catch (_) {}
    cleanup();

    if (reason === 'time') {
      await offerMsg.edit({
        embeds: [manager.sender.embed({
          color: manager.sender.colors.orange,
          title: '⏳ Zar Atılmadı',
          description: 'Süre içinde kimse zar atmadı. Düello iptal edildi, bahisler iade edildi.',
          footer: { text: ' ' }
        })],
        components: []
      }).catch(() => {});
    }
  });
}

async function startDuel({ manager, offerMsg, challenger, target, amount, cleanup }) {
  const pool = amount * 2;
  const p1 = rollTwo();
  const p2 = rollTwo();

  const base = {
    mode: 'duel',
    amount,
    pool,
    p1: { ...p1, name: challenger.username },
    p2: { ...p2, name: target.username },
  };

  const line1 = `🟦 <@${challenger.id}>: ${diceStr(p1.a, p1.b)} = **${p1.sum}**`;
  const line2 = `🟥 <@${target.id}>: ${diceStr(p2.a, p2.b)} = **${p2.sum}**`;

  // Masa görseli ile kademeli zar atışı
  const showFrame = async (state, content) => {
    try {
      await offerMsg.edit({
        content,
        embeds: [],
        files: [diceAttachment(state)],
        components: []
      });
      return true;
    } catch (_) {
      return false;
    }
  };

  await showFrame(
    { ...base, revealed: { p1: false, p2: false }, status: 'Zarlar atılıyor...' },
    `🟦 <@${challenger.id}> için zar atılıyor...  •  🟥 <@${target.id}> için zar atılıyor...`
  );

  await delay(1300);

  await showFrame(
    { ...base, revealed: { p1: true, p2: false }, status: 'Sıra ikinci oyuncuda...' },
    `🟦 <@${challenger.id}> zarını attı!  •  🟥 <@${target.id}> için zar atılıyor...`
  );

  await delay(1300);

  await showFrame(
    { ...base, revealed: { p1: true, p2: true }, status: 'Sonuçlar açıklanıyor...' },
    `${line1}\n${line2}`
  );

  await delay(900);

  let title, color, text, resultText, resultType;

  if (p1.sum === p2.sum) {
    try { await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: amount } }, {}); } catch (_) {}
    try { await Economy.findOneAndUpdate({ userId: target.id }, { $inc: { money: amount } }, {}); } catch (_) {}

    resultText = `BERABERLİK! ${p1.sum} - ${p2.sum}`;
    resultType = 'push';
    title = '🤝 BERABERLİK!';
    color = manager.sender.colors.gold;
    text =
      `${line1}\n${line2}\n\n` +
      `🤝 İki oyuncu da **${p1.sum}** attı! Bahisler iade edildi.`;
  } else {
    const winner = p1.sum > p2.sum ? challenger : target;
    const loser = p1.sum > p2.sum ? target : challenger;
    const winSum = p1.sum > p2.sum ? p1.sum : p2.sum;
    const loseSum = p1.sum > p2.sum ? p2.sum : p1.sum;

    let wEco = null;
    try {
      wEco = await Economy.findOneAndUpdate(
        { userId: winner.id },
        { $inc: { money: pool, xp: 25 } },
        { new: true }
      );
    } catch (e) {
      console.error('[zar-2p] Ödeme hatası:', e);
    }

    resultText = `KAZANAN: ${truncate(winner.username, 16)}`;
    resultType = 'win';
    title = `🏆 KAZANAN: ${winner.username}`;
    color = manager.sender.colors.green;
    text =
      `${line1}\n${line2}\n\n` +
      `🎉 <@${winner.id}> rakibini **${winSum} - ${loseSum}** yendi!\n` +
      `<@${loser.id}> bahsini kaybetti.\n` +
      `💰 Kazanç: **+${fmt(pool - amount)}** coin (havuz ${fmt(pool)})\n` +
      (wEco ? `💼 Yeni Bakiye: **${fmt(wEco.money ?? 0)}** coin` : '');
  }

  const finalState = {
    ...base,
    revealed: { p1: true, p2: true },
    result: resultText,
    resultType,
  };

  const ok = await showFrame(finalState, `${line1}\n${line2}\n\n${resultText}`);
  if (!ok) {
    // Görsel gönderilemezse metin embed'ine düş
    await offerMsg.edit({ embeds: [manager.sender.embed({ color, title, description: text, footer: { text: ' ' } })], components: [] }).catch(() => {});
  }

  cleanup();
}
