import Manager from '#managers';
import { Economy } from '#models';
import { misc, Button } from '#helpers';
import { createCanvas } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

const { delay, drawRoundedRect } = misc;

const MIN_BET = 50;
const MAX_BET = 50000;

const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RED_SUITS = new Set(['♥', '♦']);

const activeGames = new Map();

function rankValue(rank) {
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank);
}

function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ rank: r, suit: s, value: rankValue(r) });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function calculateHand(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.value;
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isSoftHand(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.value;
    if (c.rank === 'A') aces++;
  }
  let reducedAces = 0;
  while (total > 21 && reducedAces < aces) {
    total -= 10;
    reducedAces++;
  }
  return aces - reducedAces > 0;
}

function isBlackjack(cards) {
  return cards.length === 2 && calculateHand(cards) === 21;
}

function drawCardShape(ctx, x, y, w, h, rank, suit, opts = {}) {
  const { hidden = false } = opts;
  const radius = 10;
  const isRed = RED_SUITS.has(suit);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;
  drawRoundedRect(ctx, x, y, w, h, radius, '#ffffff', '#c5c5c5', 1);
  ctx.restore();

  if (hidden) {
    const gx = x + 8;
    const gy = y + 8;
    const gw = w - 16;
    const gh = h - 16;
    const grad = ctx.createLinearGradient(gx, gy, gx, gy + gh);
    grad.addColorStop(0, '#1a3d7a');
    grad.addColorStop(0.5, '#2a58a8');
    grad.addColorStop(1, '#1a3d7a');
    drawRoundedRect(ctx, gx, gy, gw, gh, 6, grad, '#0a2a5e', 2);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let ly = gy + 14; ly < gy + gh - 10; ly += 10) {
      ctx.beginPath();
      ctx.moveTo(gx + 6, ly);
      ctx.lineTo(gx + gw - 6, ly);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const color = isRed ? '#d32f2f' : '#181818';
  const cornerFont = Math.floor(h * 0.15);
  ctx.font = `bold ${cornerFont}px Arial`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillText(rank, x + 8, y + 6);
  ctx.font = `bold ${Math.floor(cornerFont * 0.9)}px Arial`;
  ctx.fillText(suit, x + 8, y + 6 + cornerFont);

  ctx.save();
  ctx.translate(x + w, y + h);
  ctx.rotate(Math.PI);
  ctx.font = `bold ${cornerFont}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.fillText(rank, 8, 6);
  ctx.font = `bold ${Math.floor(cornerFont * 0.9)}px Arial`;
  ctx.fillText(suit, 8, 6 + cornerFont);
  ctx.restore();

  const cx = x + w / 2;
  const cy = y + h / 2;
  const isFace = ['J', 'Q', 'K'].includes(rank);

  if (rank === 'A') {
    ctx.font = `bold ${Math.floor(h * 0.45)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(suit, cx, cy);
  } else if (isFace) {
    ctx.font = `bold ${Math.floor(h * 0.3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(suit, cx, cy - h * 0.15);
    ctx.font = `bold ${Math.floor(h * 0.22)}px Arial`;
    ctx.fillStyle = isRed ? '#c62828' : '#2a2a2a';
    ctx.fillText(rank, cx, cy + h * 0.14);
  } else {
    const count = parseInt(rank);
    const symSize = Math.floor(h * 0.16);
    ctx.font = `bold ${symSize}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const layouts = {
      2: [[0.5, 0.25], [0.5, 0.75]],
      3: [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
      4: [[0.3, 0.22], [0.7, 0.22], [0.3, 0.78], [0.7, 0.78]],
      5: [[0.3, 0.22], [0.7, 0.22], [0.5, 0.5], [0.3, 0.78], [0.7, 0.78]],
      6: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
      7: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.38], [0.3, 0.56], [0.7, 0.56], [0.3, 0.8], [0.7, 0.8]],
      8: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.36], [0.3, 0.52], [0.7, 0.52], [0.5, 0.68], [0.3, 0.84], [0.7, 0.84]],
      9: [[0.3, 0.18], [0.7, 0.18], [0.3, 0.39], [0.7, 0.39], [0.5, 0.5], [0.3, 0.61], [0.7, 0.61], [0.3, 0.82], [0.7, 0.82]],
      10: [[0.3, 0.16], [0.7, 0.16], [0.3, 0.34], [0.7, 0.34], [0.5, 0.5], [0.3, 0.66], [0.7, 0.66], [0.3, 0.84], [0.7, 0.84], [0.5, 0.84]]
    };

    const positions = layouts[count] || [[0.5, 0.5]];
    for (const [px, py] of positions) {
      ctx.fillText(suit, x + w * px, y + h * py);
    }

    if (count === 10) {
      ctx.fillText(suit, x + w * 0.5, y + h * 0.16);
    }
  }
}

function drawScorePill(ctx, x, y, width, score, state = 'normal') {
  const colors = {
    bust: { fill: '#c62828', text: '#fff', stroke: '#8b0000' },
    normal: { fill: '#1976d2', text: '#fff', stroke: '#0d47a1' },
    good: { fill: '#2e7d32', text: '#fff', stroke: '#1b5e20' },
    warn: { fill: '#e65100', text: '#fff', stroke: '#bf360c' }
  };
  const c = colors[state] || colors.normal;
  const h = 38;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  drawRoundedRect(ctx, x - width / 2, y, width, h, 19, c.fill, c.stroke, 2);
  ctx.restore();
  ctx.fillStyle = c.text;
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(score), x, y + h / 2);
}

function drawBanner(ctx, x, y, width, text, type = 'win') {
  const palette = {
    win:   { fill: '#2e7d32', stroke: '#1b5e20', glow: '#4caf50', text: '#ffffff' },
    lose:  { fill: '#c62828', stroke: '#8b0000', glow: '#f44336', text: '#ffffff' },
    push:  { fill: '#f9a825', stroke: '#f57f17', glow: '#ffeb3b', text: '#1a1a1a' }
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
  ctx.font = 'bold 34px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + h / 2 + 2);
}

function renderBlackjackTable(state) {
  const { playerCards, dealerCards, amount, result, resultType, dealerHidden } = state;

  const W = 920;
  const H = 560;
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

  ctx.save();
  const badgeGrad = ctx.createLinearGradient(36, 36, 36 + 110, 36 + 40);
  badgeGrad.addColorStop(0, '#1a1a28');
  badgeGrad.addColorStop(1, '#2a2a3e');
  drawRoundedRect(ctx, 36, 36, 110, 40, 12, badgeGrad, '#3a3a55', 2);
  const dots = [['#e53935', 55], ['#43a047', 80], ['#1e88e5', 105]];
  for (const [col, dx] of dots) {
    ctx.beginPath();
    ctx.arc(dx, 56, 9, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  const bjTitle = 'BLACKJACK';
  ctx.font = 'bold 56px Arial Black, Arial';
  const tw = ctx.measureText(bjTitle).width;
  const tx = W / 2 - tw / 2;
  const ty = 56;
  ctx.fillStyle = '#f5c842';
  ctx.fillText(bjTitle, tx, ty);
  ctx.fillStyle = '#fffde7';
  ctx.fillText('BLACK', tx, ty);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeText(bjTitle, tx, ty);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(245, 200, 66, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 120, 82);
  ctx.lineTo(W / 2 + 120, 82);
  ctx.stroke();
  ctx.restore();

  const cardW = 96;
  const cardH = 136;
  const cardGap = 18;

  const dealerLabelY = 120;
  ctx.fillStyle = '#f5f5f5';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('DEALER', W / 2, dealerLabelY);

  const dealerCount = dealerCards.length;
  const dealerTotalW = dealerCount * cardW + (dealerCount - 1) * cardGap;
  let dealerStartX = W / 2 - dealerTotalW / 2;
  const dealerY = 150;

  for (let i = 0; i < dealerCards.length; i++) {
    const card = dealerCards[i];
    const cx = dealerStartX + i * (cardW + cardGap);
    const hide = dealerHidden && i === 1;
    drawCardShape(ctx, cx, dealerY, cardW, cardH, card.rank, card.suit, { hidden: hide });
  }

  const dealerScoreX = W / 2;
  const dealerScoreY = dealerY + cardH + 14;
  let dScoreVisible = 0;
  if (dealerHidden) {
    if (dealerCards[0]) dScoreVisible = dealerCards[0].rank === 'A' ? 11 : rankValue(dealerCards[0].rank);
  } else {
    dScoreVisible = calculateHand(dealerCards);
  }
  const dealerScoreState = !dealerHidden && dScoreVisible > 21 ? 'bust'
    : !dealerHidden && dScoreVisible === 21 ? 'good'
    : 'good';
  const pillWidth = 74;
  drawScorePill(ctx, dealerScoreX, dealerScoreY, pillWidth, dScoreVisible, dealerScoreState);

  if (result) {
    let rType = 'lose';
    let rText = result;
    if (resultType === 'win') rType = 'win';
    if (resultType === 'push') rType = 'push';
    if (resultType === 'lose') rType = 'lose';
    drawBanner(ctx, W / 2 - 300, H / 2 - 34, 600, rText, rType);
  }

  const playerLabelY = H - 150;
  ctx.fillStyle = '#f5f5f5';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('PLAYER', W / 2, playerLabelY);

  const playerCount = playerCards.length;
  const playerTotalW = playerCount * cardW + (playerCount - 1) * cardGap;
  let playerStartX = W / 2 - playerTotalW / 2;
  const playerY = H - 136 - 50;

  for (let i = 0; i < playerCards.length; i++) {
    const card = playerCards[i];
    const cx = playerStartX + i * (cardW + cardGap);
    drawCardShape(ctx, cx, playerY, cardW, cardH, card.rank, card.suit);
  }

  const playerScore = calculateHand(playerCards);
  const playerScoreState = playerScore > 21 ? 'bust'
    : playerScore === 21 ? 'good'
    : playerScore >= 18 ? 'warn'
    : 'normal';
  const pPillColor = resultType === 'win' ? 'good' : resultType === 'lose' ? 'bust' : playerScoreState;
  drawScorePill(ctx, W / 2, playerY + cardH + 14, pillWidth, playerScore, pPillColor);

  ctx.save();
  drawRoundedRect(ctx, 36, H - 74, 200, 44, 12, 'rgba(15, 23, 42, 0.85)', '#1e293b', 2);
  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`BET: ${amount.toLocaleString('tr-TR')}`, 56, H - 52);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

export default {
  name: 'bj',
  category: 'fun',
  aliases: ['blackjack', '21'],
  usage: '.bj <bahisMiktarı|all>',
  description: 'Blackjack (21) oyna. 21\'e en yakın olan kazanır!',
  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;

    if (activeGames.has(userId)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Zaten aktif bir Blackjack oyunun var. Önce onu bitir!'));
    }

    const rawArg = (args[0] || '').toString().toLowerCase().trim();
    const isAll = rawArg === 'all' || rawArg === 'max' || rawArg === 'tüm' || rawArg === 'hepsi';

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
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Geçerli bir bahis miktarı belirt. Kullanım: \`.bj 500\` veya \`.bj all\``));
      }
      if (amount < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Minimum bahis miktarı **${MIN_BET.toLocaleString('tr-TR')}** coin.`));
      }
      if (amount > MAX_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Maksimum bahis miktarı **${MAX_BET.toLocaleString('tr-TR')}** coin.`));
      }
    }

    if ((userData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Yeterli coin yok. Gereken: **${amount.toLocaleString('tr-TR')}** coin. ${isAll ? '(all/max modu kullanıldı)' : ''}`));
    }

    try {
      userData = await Economy.findOneAndUpdate(
        { userId },
        { $inc: { money: -amount } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } catch (e) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bahis çekimi sırasında hata oluştu.'));
    }

    activeGames.set(userId, true);

    const NUM_DECKS = 6;
    const BJ_PAYOUT = 1.5;

    let deck = shuffleDeck(Array.from({ length: NUM_DECKS }, () => createDeck()).flat());
    const playerCards = [deck.pop(), deck.pop()];
    const dealerCards = [deck.pop(), deck.pop()];

    let gameOver = false;
    let result = null;
    let resultType = null;
    let winnings = 0;
    let xpGain = 0;
    let dealerHidden = true;

    const playerBJ = isBlackjack(playerCards);
    const dealerBJ = isBlackjack(dealerCards);

    if (playerBJ || dealerBJ) {
      dealerHidden = false;
      gameOver = true;
      if (playerBJ && dealerBJ) {
        resultType = 'push';
        result = 'PUSH — BERABERE';
        winnings = amount;
      } else if (playerBJ) {
        resultType = 'win';
        const profit = Math.floor(amount * BJ_PAYOUT);
        result = `BLACKJACK! +${profit.toLocaleString('tr-TR')}`;
        winnings = amount + profit;
        xpGain = 10;
      } else {
        resultType = 'lose';
        result = `DEALER BLACKJACK! -${amount.toLocaleString('tr-TR')}`;
      }
    }

    const buildAttachment = () => {
      const buf = renderBlackjackTable({
        playerCards, dealerCards, amount, result, resultType, dealerHidden
      });
      return new AttachmentBuilder(buf, { name: 'blackjack.png' });
    };

    const buildButtons = () => {
      const btn = new Button();
      try {
        btn.add('bj_hit', 'Kart Çek', btn.style.Success, undefined, false);
        btn.add('bj_stand', 'Dur', btn.style.Danger, undefined, false);
        const built = btn.build();
        try {
          const json = built.toJSON();
          if (json && Array.isArray(json.components)) {
            json.components.forEach((c) => { c.disabled = false; });
          }
          JSON.stringify(json);
        } catch (_) {}
        return built;
      } catch (e) {
        console.warn('[blackjack] buton hatasi, fallback donuluyor:', e?.message);
        const sb = new Button();
        sb.add('bj_hit', 'Kart Çek', sb.style.Success, undefined, false);
        sb.add('bj_stand', 'Dur', sb.style.Danger, undefined, false);
        return sb.build();
      }
    };

    let replyMsg;
    let usedFallback = false;
    try {
      replyMsg = await message.channel.send({
        content: `<@${userId}> Blackjack elin başladı!`,
        files: [buildAttachment()],
        components: gameOver ? [] : [buildButtons()]
      });
    } catch (e) {
      console.error('[blackjack] Resimli gönderim başarısız (izin/network hatası), fallback deniyor:', e?.message || e);
      try {
        const pScore = calculateHand(playerCards);
        const dOpen = dealerCards[0];
        const dText = dealerHidden
          ? `[${dOpen.rank}${dOpen.suit}] [❓]`
          : dealerCards.map(c => `[${c.rank}${c.suit}]`).join(' ');
        const pText = playerCards.map(c => `[${c.rank}${c.suit}]`).join(' ');
        const simple = `🎴 **BLACKJACK** | Bahis: ${amount.toLocaleString('tr-TR')} coin\n\n` +
          `🤖 **DEALER**: ${dText}  ${dealerHidden ? `(${dOpen.rank === 'A' ? 11 : rankValue(dOpen.rank)})` : `(${calculateHand(dealerCards)})`}\n` +
          `🧑 **SEN**:     ${pText}  (${pScore})\n\n` +
          (result ? `**SONUÇ:** ${result}` : 'Aşağıdaki butonlarla oynayabilirsin.');
        replyMsg = await message.channel.send({
          content: simple,
          components: gameOver ? [] : [buildButtons()]
        });
        usedFallback = true;
      } catch (e2) {
        console.error('[blackjack] Fallback da başarısız:', e2?.message || e2);
        try {
          await manager.sender.reply(manager.sender.errorEmbed(
            '❌ Mesaj gönderilemedi. Botun **Mesaj Gönder** ve **Dosya Ekle** izinleri açık mı kontrol et!'
          ));
        } catch (_) {}
        activeGames.delete(userId);
        try {
          await Economy.findOneAndUpdate({ userId }, { $inc: { money: amount } });
        } catch (_) {}
        return;
      }
    }

    const buildTextSnapshot = () => {
      const pScore = calculateHand(playerCards);
      const dScore = dealerHidden ? null : calculateHand(dealerCards);
      const dOpen = dealerCards[0];
      const dText = dealerHidden
        ? `[${dOpen.rank}${dOpen.suit}] [❓]`
        : dealerCards.map(c => `[${c.rank}${c.suit}]`).join(' ');
      const dScoreText = dealerHidden
        ? ` (${dOpen.rank === 'A' ? 11 : rankValue(dOpen.rank)}+?)`
        : ` (${dScore}${dScore > 21 ? ' — BATTIN' : ''})`;
      const pText = playerCards.map(c => `[${c.rank}${c.suit}]`).join(' ');
      const status = result ? `**SONUÇ:** ${result}` : 'Aşağıdaki butonlarla oynayabilirsin.';
      return `🎴 **BLACKJACK** | Bahis: ${amount.toLocaleString('tr-TR')} coin\n\n` +
        `🤖 **DEALER**: ${dText}${dScoreText}\n` +
        `🧑 **SEN**:     ${pText}  (${pScore}${pScore > 21 ? ' — BATTIN' : ''})\n\n` +
        status;
    };

    const tryEdit = async () => {
      const buttons = gameOver ? [] : [buildButtons()];
      if (!usedFallback) {
        try {
          await replyMsg.edit({ files: [buildAttachment()], components: buttons });
          return true;
        } catch (_) {
          usedFallback = true;
        }
      }
      try {
        await replyMsg.edit({ content: buildTextSnapshot(), components: buttons });
        return true;
      } catch (e) {
        console.warn('[blackjack] edit fallback başarısız:', e?.message);
        return false;
      }
    };

    const payAndFinalize = async () => {
      if (winnings > 0) {
        try {
          await Economy.findOneAndUpdate(
            { userId },
            { $inc: { money: winnings, xp: xpGain } },
            { new: true }
          );
        } catch (e) {
          console.error('[blackjack] Ödeme hatası:', e);
        }
      }
      gameOver = true;
      await tryEdit();
      activeGames.delete(userId);
    };

    if (gameOver) {
      await payAndFinalize();
      return;
    }

    const collector = replyMsg.createMessageComponentCollector({ time: 90_000 });

    const dealerPlay = async () => {
      dealerHidden = false;
      await tryEdit();
      await delay(320);

      let dScore = calculateHand(dealerCards);
      let soft = isSoftHand(dealerCards);
      while (dScore < 17 || (dScore === 17 && soft)) {
        if (deck.length < 1) deck = shuffleDeck(Array.from({ length: NUM_DECKS }, () => createDeck()).flat());
        dealerCards.push(deck.pop());
        dScore = calculateHand(dealerCards);
        soft = isSoftHand(dealerCards);
        await tryEdit();
        await delay(380);
      }

      const pScore = calculateHand(playerCards);
      if (dScore > 21) {
        resultType = 'win';
        result = `DEALER BATTIN! +${amount.toLocaleString('tr-TR')}`;
        winnings = amount * 2;
        xpGain = 5;
      } else if (dScore > pScore) {
        resultType = 'lose';
        result = `KAYBETTİN! -${amount.toLocaleString('tr-TR')}`;
      } else if (dScore < pScore) {
        resultType = 'win';
        result = `KAZANDIN! +${amount.toLocaleString('tr-TR')}`;
        winnings = amount * 2;
        xpGain = 5;
      } else {
        resultType = 'push';
        result = 'PUSH — BERABERE';
        winnings = amount;
      }

      gameOver = true;
      try { collector.stop('gameEnd'); } catch (_) {}
      await payAndFinalize();
    };

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== userId) {
        try {
          await interaction.reply({
            content: '❌ Bu Blackjack oyunu senin değil! Sadece oyunu başlatan kişi butonlara basabilir.',
            ephemeral: true
          });
        } catch (_) {}
        return;
      }
      try { await interaction.deferUpdate(); } catch (_) {}

      if (gameOver) return;

      if (interaction.customId === 'bj_hit') {
        if (deck.length < 1) deck = shuffleDeck(Array.from({ length: NUM_DECKS }, () => createDeck()).flat());
        playerCards.push(deck.pop());
        const pScore = calculateHand(playerCards);

        await tryEdit();

        if (pScore > 21) {
          dealerHidden = false;
          gameOver = true;
          resultType = 'lose';
          result = `BATTIN! -${amount.toLocaleString('tr-TR')}`;
          try { collector.stop('gameEnd'); } catch (_) {}
          await payAndFinalize();
        } else if (pScore === 21) {
          gameOver = true;
          await dealerPlay();
        }
      } else if (interaction.customId === 'bj_stand') {
        gameOver = true;
        await dealerPlay();
      }
    });

    collector.on('end', async (_, reason) => {
      if (gameOver) return;
      gameOver = true;
      dealerHidden = false;
      resultType = 'lose';
      result = `SÜRE DOLDU! -${amount.toLocaleString('tr-TR')}`;
      await tryEdit();
      activeGames.delete(userId);
    });
  },
};
