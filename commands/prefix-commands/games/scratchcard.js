import Manager from '#managers';
import { Economy } from '#models';
import { misc } from '#helpers';
import { createCanvas } from '@napi-rs/canvas';
import { AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

const { drawRoundedRect } = misc;

const MIN_BET = 50;
const MAX_BET = 50000;
const ALL_KEYWORDS = ['all', 'max', 'tüm', 'hepsi'];
const SCRATCH_TIME = 120000; 
const HIDDEN_EMOJI = '❔';

const activeGames = new Set();

const WIN_CHANCE = 0.275;

const SYMBOLS = {
  cherry: { key: 'cherry', label: 'Kiraz', emoji: '🍒', mult: 2 },
  bell: { key: 'bell', label: 'Çan', emoji: '🔔', mult: 3 },
  diamond: { key: 'diamond', label: 'Elmas', emoji: '💎', mult: 8 },
  seven: { key: 'seven', label: 'Yedi', emoji: '7️⃣', mult: 20 },
  money: { key: 'money', label: 'Para', emoji: '💰', mult: 100 },
};

const WIN_WEIGHTS = [
  { key: 'cherry', w: 600 },
  { key: 'bell', w: 250 },
  { key: 'diamond', w: 80 },
  { key: 'seven', w: 15 },
  { key: 'money', w: 4 },
];

const LINE_CELLS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];


const fmt = (n) => Math.floor(n).toLocaleString('tr-TR');
const randomInt = (max) => Math.floor(Math.random() * max);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWeighted(weights) {
  const total = weights.reduce((sum, item) => sum + item.w, 0);
  let roll = Math.random() * total;
  for (const item of weights) {
    if (roll < item.w) return item.key;
    roll -= item.w;
  }
  return weights[weights.length - 1].key;
}


function buildLoseGrid() {
  const perm = shuffle(Object.keys(SYMBOLS));
  const offset = randomInt(5);
  const grid = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      grid[r * 3 + c] = perm[(r + 2 * c + offset) % 5];
    }
  }
  return grid;
}


function hasOtherWin(grid, lineIndex) {
  for (let li = 0; li < LINE_CELLS.length; li++) {
    if (li === lineIndex) continue;
    const [a, b, c] = LINE_CELLS[li];
    if (grid[a] && grid[a] === grid[b] && grid[b] === grid[c]) return true;
  }
  return false;
}

function buildWinGrid(symbolKey, lineIndex) {
  const line = LINE_CELLS[lineIndex];
  const others = Object.keys(SYMBOLS).filter((k) => k !== symbolKey);
  const grid = new Array(9).fill(null);
  for (const idx of line) grid[idx] = symbolKey;

  const empty = [];
  for (let i = 0; i < 9; i++) if (grid[i] === null) empty.push(i);

  for (let attempt = 0; attempt < 200; attempt++) {
    for (const idx of empty) grid[idx] = others[randomInt(others.length)];
    if (!hasOtherWin(grid, lineIndex)) return grid;
  }

 
  const perm = shuffle(others);
  const offset = randomInt(others.length);
  for (const idx of empty) {
    const r = Math.floor(idx / 3);
    const c = idx % 3;
    grid[idx] = perm[(r + 2 * c + offset) % others.length];
  }
  return grid;
}

function generateResult() {
  if (Math.random() >= WIN_CHANCE) {
    return { win: false, grid: buildLoseGrid(), symbol: null, line: null };
  }
  const symbolKey = pickWeighted(WIN_WEIGHTS);
  const lineIndex = randomInt(LINE_CELLS.length);
  return {
    win: true,
    grid: buildWinGrid(symbolKey, lineIndex),
    symbol: symbolKey,
    line: LINE_CELLS[lineIndex],
  };
}


function drawCherry(ctx, cx, cy, u) {
  const r = u * 0.15;
  ctx.save();
  ctx.strokeStyle = '#4caf50';
  ctx.lineWidth = u * 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - u * 0.12, cy + u * 0.02);
  ctx.quadraticCurveTo(cx - u * 0.02, cy - u * 0.26, cx + u * 0.05, cy - u * 0.32);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + u * 0.12, cy + u * 0.02);
  ctx.quadraticCurveTo(cx + u * 0.03, cy - u * 0.26, cx + u * 0.05, cy - u * 0.32);
  ctx.stroke();
  ctx.fillStyle = '#66bb6a';
  ctx.beginPath();
  ctx.ellipse(cx + u * 0.16, cy - u * 0.30, u * 0.11, u * 0.05, -0.5, 0, Math.PI * 2);
  ctx.fill();

  for (const bx of [cx - u * 0.13, cx + u * 0.13]) {
    const grad = ctx.createRadialGradient(bx - r * 0.35, cy + u * 0.02 - r * 0.35, r * 0.15, bx, cy + u * 0.02, r);
    grad.addColorStop(0, '#ff7676');
    grad.addColorStop(1, '#b71c1c');
    ctx.beginPath();
    ctx.arc(bx, cy + u * 0.02, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx - r * 0.35, cy + u * 0.02 - r * 0.35, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();
  }
  ctx.restore();
}

function drawBell(ctx, cx, cy, u) {
  const w = u * 0.46;
  const h = u * 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + h * 0.35);
  ctx.quadraticCurveTo(cx - w / 2, cy - h * 0.58, cx, cy - h * 0.62);
  ctx.quadraticCurveTo(cx + w / 2, cy - h * 0.58, cx + w / 2, cy + h * 0.35);
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
  grad.addColorStop(0, '#ffe082');
  grad.addColorStop(1, '#f9a825');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#e08b00';
  ctx.lineWidth = u * 0.02;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.66, u * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = '#f57f17';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - w * 0.66, cy + h * 0.35);
  ctx.lineTo(cx + w * 0.66, cy + h * 0.35);
  ctx.lineWidth = u * 0.07;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f57f17';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy + h * 0.5, u * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = '#f57f17';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx - w * 0.16, cy - h * 0.12, w * 0.09, h * 0.2, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  ctx.restore();
}

function drawDiamond(ctx, cx, cy, u) {
  const w = u * 0.46;
  const h = u * 0.54;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.5);
  ctx.lineTo(cx + w * 0.5, cy - h * 0.1);
  ctx.lineTo(cx, cy + h * 0.5);
  ctx.lineTo(cx - w * 0.5, cy - h * 0.1);
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx, cy - h * 0.5, cx, cy + h * 0.5);
  grad.addColorStop(0, '#b3e5fc');
  grad.addColorStop(0.5, '#29b6f6');
  grad.addColorStop(1, '#0277bd');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#01579b';
  ctx.lineWidth = u * 0.02;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = u * 0.012;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, cy - h * 0.1);
  ctx.lineTo(cx + w * 0.5, cy - h * 0.1);
  ctx.moveTo(cx, cy - h * 0.5);
  ctx.lineTo(cx - w * 0.26, cy - h * 0.1);
  ctx.lineTo(cx, cy + h * 0.5);
  ctx.moveTo(cx, cy - h * 0.5);
  ctx.lineTo(cx + w * 0.26, cy - h * 0.1);
  ctx.lineTo(cx, cy + h * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawSeven(ctx, cx, cy, u) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(u * 0.78)}px Arial Black, Arial`;
  ctx.lineWidth = u * 0.035;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeText('7', cx, cy + u * 0.02);
  const grad = ctx.createLinearGradient(cx, cy - u * 0.35, cx, cy + u * 0.35);
  grad.addColorStop(0, '#ff5252');
  grad.addColorStop(1, '#b71c1c');
  ctx.fillStyle = grad;
  ctx.fillText('7', cx, cy + u * 0.02);
  ctx.restore();
}

function drawMoney(ctx, cx, cy, u) {
  const w = u * 0.46;
  const h = u * 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, cy + h * 0.12);
  ctx.quadraticCurveTo(cx - w * 0.6, cy + h * 0.62, cx, cy + h * 0.62);
  ctx.quadraticCurveTo(cx + w * 0.6, cy + h * 0.62, cx + w * 0.5, cy + h * 0.12);
  ctx.quadraticCurveTo(cx + w * 0.3, cy - h * 0.02, cx + w * 0.2, cy - h * 0.16);
  ctx.lineTo(cx + w * 0.22, cy - h * 0.34);
  ctx.lineTo(cx - w * 0.22, cy - h * 0.34);
  ctx.lineTo(cx - w * 0.2, cy - h * 0.16);
  ctx.quadraticCurveTo(cx - w * 0.3, cy - h * 0.02, cx - w * 0.5, cy + h * 0.12);
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx, cy - h * 0.34, cx, cy + h * 0.62);
  grad.addColorStop(0, '#a5d6a7');
  grad.addColorStop(1, '#2e7d32');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#1b5e20';
  ctx.lineWidth = u * 0.018;
  ctx.stroke();

  ctx.fillStyle = '#1b5e20';
  ctx.fillRect(cx - w * 0.24, cy - h * 0.36, w * 0.48, h * 0.07);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(u * 0.42)}px Arial`;
  ctx.fillStyle = '#0d3d12';
  ctx.fillText('$', cx, cy + h * 0.18);
  ctx.restore();
}

function drawSymbol(ctx, key, cx, cy, u) {
  switch (key) {
    case 'cherry': return drawCherry(ctx, cx, cy, u);
    case 'bell': return drawBell(ctx, cx, cy, u);
    case 'diamond': return drawDiamond(ctx, cx, cy, u);
    case 'seven': return drawSeven(ctx, cx, cy, u);
    case 'money': return drawMoney(ctx, cx, cy, u);
    default: return undefined;
  }
}

function drawPill(ctx, cx, y, text, fill, stroke, opts = {}) {
  const { height = 40, fontSize = 20, color = '#ffffff' } = opts;
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial`;
  const width = Math.max(ctx.measureText(text).width + 44, 150);
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  drawRoundedRect(ctx, cx - width / 2, y, width, height, height / 2, fill, stroke, 2);
  ctx.restore();

  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + height / 2 + 1);
}

function drawBanner(ctx, x, y, width, text, type = 'win') {
  const palette = {
    win: { fill: '#2e7d32', stroke: '#1b5e20', glow: '#4caf50', text: '#ffffff' },
    lose: { fill: '#c62828', stroke: '#8b0000', glow: '#f44336', text: '#ffffff' },
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
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + h / 2 + 2);
}

const CARD_W = 900;
const CARD_H = 790;
const CELL_W = 220;
const CELL_H = 160;
const GAP = 18;
const GRID_W = CELL_W * 3 + GAP * 2;
const GRID_H = CELL_H * 3 + GAP * 2;
const GRID_X = (CARD_W - GRID_W) / 2;
const GRID_Y = 172;

function renderCard({ amount, grid, win, line, net }) {
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext('2d');

  
  const frame = ctx.createLinearGradient(0, 0, 0, CARD_H);
  frame.addColorStop(0, '#241640');
  frame.addColorStop(0.55, '#16122a');
  frame.addColorStop(1, '#0b0f1e');
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, 26, frame, '#f5c842', 4);

  ctx.save();
  const glow = ctx.createRadialGradient(CARD_W / 2, 70, 40, CARD_W / 2, CARD_H / 2, 640);
  glow.addColorStop(0, 'rgba(245,200,66,0.12)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(24, 24, CARD_W - 48, CARD_H - 48);
  ctx.restore();

  
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 46px Arial Black, Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText('KAZI KAZAN', CARD_W / 2 + 2, 34);
  ctx.fillStyle = '#f5c842';
  ctx.fillText('KAZI KAZAN', CARD_W / 2, 32);
  ctx.restore();

  drawPill(ctx, 176, 104, `BAHİS: ${fmt(amount)}`, 'rgba(15,23,42,0.9)', '#1e293b', { fontSize: 19 });
  drawPill(
    ctx, CARD_W - 176, 104,
    win ? '3 AYNI = KAZANÇ' : '3 AYNI YOK',
    win ? '#1d4ed8' : '#334155',
    win ? '#1e3a8a' : '#0f172a',
    { fontSize: 19 }
  );

  
  for (let i = 0; i < 9; i++) {
    const r = Math.floor(i / 3);
    const c = i % 3;
    const x = GRID_X + c * (CELL_W + GAP);
    const y = GRID_Y + r * (CELL_H + GAP);
    const isWin = win && line && line.includes(i);

    ctx.save();
    if (isWin) {
      ctx.shadowColor = '#f5c842';
      ctx.shadowBlur = 22;
    }
    const tile = ctx.createLinearGradient(x, y, x, y + CELL_H);
    tile.addColorStop(0, isWin ? '#3c3014' : '#1a2136');
    tile.addColorStop(1, isWin ? '#2a2209' : '#101626');
    drawRoundedRect(
      ctx, x, y, CELL_W, CELL_H, 18,
      tile,
      isWin ? '#f5c842' : 'rgba(148,163,184,0.22)',
      isWin ? 3 : 2
    );
    ctx.restore();

    drawSymbol(ctx, grid[i], x + CELL_W / 2, y + CELL_H / 2, 150);
  }

 
  const bannerText = win ? `KAZANDIN!  +${fmt(net)}` : `KAYBETTİN!  -${fmt(amount)}`;
  drawBanner(ctx, GRID_X, GRID_Y + GRID_H + 26, GRID_W, bannerText, win ? 'win' : 'lose');

  return canvas.toBuffer('image/png');
}

function emojiGrid(grid) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    rows.push(grid.slice(r * 3, r * 3 + 3).map((k) => SYMBOLS[k]?.emoji ?? '⬛').join('  '));
  }
  return rows.join('\n');
}


function buildScratchRows(userId, revealed, grid) {
  const rows = [];
  for (let r = 0; r < 2; r++) {
    const row = new ActionRowBuilder();
    const count = r === 0 ? 5 : 4;
    for (let c = 0; c < count; c++) {
      const idx = r * 5 + c;
      const btn = new ButtonBuilder()
        .setCustomId(`kk_${userId}_${idx}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji(HIDDEN_EMOJI);
      if (revealed[idx]) {
        btn
          .setEmoji(SYMBOLS[grid[idx]].emoji)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

export default {
  name: 'kazikazan',
  category: 'games',
  aliases: ['kazıkazan', 'scratch', 'kazikaz', 'kk', 'scratchcard', 'scc'],
  usage: '.kazikazan <bahisMiktarı|all>',
  description: 'Kazı kazan kartını kazı! Aynı çizgide 3 sembol eşleşirse sembolün çarpanı kadar kazanırsın. all = maksimum bahis.',
  permissions: { enabled: false },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;

    if (activeGames.has(userId)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Devam eden bir kazı kazan oyunun var. Önce onu bitir.'));
    }

    const rawArg = (args[0] || '').toString().toLowerCase().trim();
    const isAll = ALL_KEYWORDS.includes(rawArg);

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
          `❌ All modu için bakiyen minimum **${fmt(MIN_BET)}** coin olmalı. Mevcut: **${fmt(balance)}** coin`
        ));
      }
      amount = Math.min(balance, MAX_BET);
    } else {
      amount = parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return manager.sender.reply(manager.sender.errorEmbed(
          `❌ Geçerli bir bahis miktarı belirt. Kullanım: \`.kazikazan 500\` veya \`.kazikazan all\``
        ));
      }
      if (amount < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Minimum bahis miktarı **${fmt(MIN_BET)}** coin.`));
      }
      if (amount > MAX_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Maksimum bahis miktarı **${fmt(MAX_BET)}** coin.`));
      }
    }

    if ((userData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(
        `❌ Yeterli coin yok. Gereken: **${fmt(amount)}** coin. ${isAll ? '(all/max modu kullanıldı)' : ''}`
      ));
    }

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

      const { win, grid, symbol, line } = generateResult();
      const mult = win ? SYMBOLS[symbol].mult : 0;
      const winnings = win ? Math.floor(amount * mult) : 0;
      const net = winnings - amount;
      const xpGain = win
        ? { cherry: 3, bell: 4, diamond: 6, seven: 12, money: 25 }[symbol] ?? 3
        : 1;

      const revealed = new Array(9).fill(false);

      const scratchEmbed = manager.sender.embed({
        color: manager.sender.colors.purple,
        title: '🎫 KAZI KAZAN',
        description:
          `**Oyuncu:** <@${userId}> • **Bahis:** \`${fmt(amount)}\` coin\n\n` +
          `Aşağıdaki **9 hücreyi** tek tek kazı! 🔎\n` +
          `Aynı çizgide (yatay / dikey / çapraz) **3 aynı sembol** gelirse sembolün çarpanı kadar kazanırsın.\n\n` +
          `🍒 **2x** • 🔔 **3x** • 💎 **8x** • 7️⃣ **20x** • 💰 **100x**`,
        footer: { text: 'Hücrelere tıklayarak kazı • 2 dakika içinde bitir' },
      });

      let gameMsg;
      try {
        gameMsg = await message.channel.send({
          content: `🎫 <@${userId}> **KAZI KAZAN** • Bahis: **${fmt(amount)}** coin`,
          embeds: [scratchEmbed],
          components: buildScratchRows(userId, revealed, grid),
        });
      } catch (e) {
        console.error('[kazikazan] Oyun mesajı gönderilemedi:', e?.message || e);
        await refund();
        try { await manager.sender.reply(manager.sender.errorEmbed('❌ Oyun başlatılamadı. Bahsin iade edildi.')); } catch (_) {}
        return;
      }

      let resolved = false;

      const finish = async () => {
        resolved = true;
        charged = false;

        if (win) {
          try {
            await Economy.findOneAndUpdate({ userId }, { $inc: { money: winnings, xp: xpGain } }, { new: true });
          } catch (e) {
            console.error('[kazikazan] Ödeme hatası:', e);
          }
        } else {
          try { await Economy.findOneAndUpdate({ userId }, { $inc: { xp: 1 } }, { new: true }); } catch (_) {}
        }

        const latest = await Economy.findOne({ userId }).catch(() => null);
        const balance = latest?.money ?? 0;

        const resultText = win
          ? `${SYMBOLS[symbol].emoji} **3 x ${SYMBOLS[symbol].label}** eşleşti!\n` +
            `🎯 Çarpan: **${mult}x**\n` +
            `💰 Kazanç: **${fmt(winnings)}** coin (**${net >= 0 ? '+' : ''}${fmt(net)}** NET)\n` +
            `✨ XP: +${xpGain}`
          : `💸 Eşleşen üçlü çıkmadı.\n` +
            `Kayıp: **-${fmt(amount)}** coin`;

        const finalEmbed = manager.sender.embed({
          color: win ? manager.sender.colors.green : manager.sender.colors.liveRed,
          title: win ? '🎉 KAZANDIN!' : '💸 KAYBETTİN',
          description:
            `**Oyuncu:** <@${userId}> • **Bahis:** \`${fmt(amount)}\` coin\n` +
            `\`\`\`\n${emojiGrid(grid)}\n\`\`\`\n` +
            `${resultText}`,
          footer: { text: `Bakiye: ${fmt(balance)} coin • 🍒2x 🔔3x 💎8x 7️⃣20x 💰100x` },
        });

        const payload = {
          content: `🎫 <@${userId}> **KAZI KAZAN** • Bahis: **${fmt(amount)}** coin`,
          embeds: [finalEmbed],
          components: [],
        };

        try {
          const buffer = renderCard({ amount, grid, win, line, net });
          payload.files = [new AttachmentBuilder(buffer, { name: 'kazikazan.png' })];
        } catch (e) {
          console.error('[kazikazan] Kart görseli üretilemedi, metne düşülüyor:', e?.message || e);
        }

        try {
          await gameMsg.edit(payload);
        } catch (e) {
          console.error('[kazikazan] Sonuç gönderilemedi:', e?.message || e);
          try { await gameMsg.edit({ ...payload, files: [] }); } catch (_) {}
        }
      };

      const collector = gameMsg.createMessageComponentCollector({ idle: SCRATCH_TIME });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== userId) {
          return interaction.reply({
            content: '❌ Bu kart senin değil. Kendi oyununu `.kazikazan <bahis>` ile başlat.',
            ephemeral: true,
          }).catch(() => {});
        }
        if (resolved) return;

        const idx = Number(interaction.customId.split('_').pop());
        if (Number.isNaN(idx) || idx < 0 || idx > 8 || revealed[idx]) {
          return interaction.deferUpdate().catch(() => {});
        }

        revealed[idx] = true;
        const allRevealed = revealed.every(Boolean);

        try { await interaction.deferUpdate(); } catch (_) {}

        if (allRevealed) {
          resolved = true;
          try { collector.stop('done'); } catch (_) {}
          await finish();
          return;
        }

        try {
          await gameMsg.edit({ components: buildScratchRows(userId, revealed, grid) });
        } catch (e) {
          console.error('[kazikazan] Kazıma güncellenemedi:', e?.message || e);
        }
      });

      collector.on('end', async (_, reason) => {
        if (resolved || reason === 'done') return;
        revealed.fill(true);
        await finish();
      });

      await new Promise((resolve) => collector.once('end', resolve));
    } catch (error) {
      console.error('[kazikazan] Hata:', error);
      try {
        await manager.sender.reply(manager.sender.errorEmbed('❌ Bir hata oluştu. Bahsin iade edildi.'));
      } catch (_) {}
    } finally {
      activeGames.delete(userId);
      await refund();
    }
  },
};
