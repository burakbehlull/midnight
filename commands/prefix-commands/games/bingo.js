import Manager from '#managers';
import { Economy } from '#models';
import { Button, Modal, misc, gameStatsHelper } from '#helpers';
import { createCanvas } from '@napi-rs/canvas';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import gifenc from 'gifenc';

const { delay, drawRoundedRect } = misc;
const { GIFEncoder, quantize, applyPalette } = gifenc;

const MIN_BET = 50;
const MAX_BET = 50000;
const ALL_KEYWORDS = ['all', 'max', 'tüm', 'hepsi'];
const START_KEYWORDS = ['başlat', 'baslat', 'start', 'oluştur', 'olustur'];
const RANDOM_KEYWORDS = ['rastgele', 'random', 'auto', 'karışık', 'karisik', 'hızlı', 'hizli', 'r'];

const JOIN_TIME = 60000;
const MODAL_TIME = 120000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

const BALL_MIN = 1;
const BALL_MAX = 90;
const CARD_SIZE = 3;
const CELL_COUNT = CARD_SIZE * CARD_SIZE;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const activeGames = new Set();
const activeLobbies = new Set();

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

function truncate(str, n) {
  const s = String(str ?? '');
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function pickCard() {
  const pool = Array.from({ length: BALL_MAX }, (_, i) => i + BALL_MIN);
  return shuffle(pool).slice(0, CELL_COUNT);
}

function parseCardInput(rows) {
  const raw = rows.map((r) => String(r ?? '').toLowerCase().trim());

  if (raw.every((r) => !r) || raw.some((r) => RANDOM_KEYWORDS.includes(r))) {
    return { ok: true, card: pickCard(), random: true };
  }

  const nums = [];
  for (const r of raw) {
    const parts = r.replace(/[^\d\s,;.\-]/g, ' ').split(/[\s,;.\-]+/).filter(Boolean);
    if (parts.length !== CARD_SIZE) {
      return { ok: false, error: `Her satıra tam **${CARD_SIZE}** sayı yazmalısın (örn: \`7 13 22\`).` };
    }
    for (const p of parts) {
      const n = parseInt(p, 10);
      if (!Number.isInteger(n) || n < BALL_MIN || n > BALL_MAX) {
        return { ok: false, error: `Sayılar **${BALL_MIN}-${BALL_MAX}** arasında olmalı.` };
      }
      nums.push(n);
    }
  }

  if (new Set(nums).size !== CELL_COUNT) {
    return { ok: false, error: 'Sayılar birbirinden farklı olmalı (tekrar eden sayı var).' };
  }

  return { ok: true, card: nums, random: false };
}

function buildCardModal(modalId) {
  const modal = new Modal(modalId, '3x3 Bingo Kartın');
  modal.add('bingo_row0', '1. Satır (3 sayı)', { placeholder: 'örn: 7 13 22', max: 40 });
  modal.add('bingo_row1', '2. Satır (3 sayı)', { placeholder: 'örn: 34 45 58', max: 40 });
  modal.add('bingo_row2', '3. Satır (3 sayı)', { placeholder: 'örn: 61 79 90', max: 40 });
  return modal.build();
}

function buildCardRows(card, panelId) {
  const rows = [];
  for (let r = 0; r < CARD_SIZE; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < CARD_SIZE; c++) {
      const idx = r * CARD_SIZE + c;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`bingo_cell_${panelId}_${idx}`)
          .setLabel(String(card[idx]))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
    }
    rows.push(row);
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bingo_manual_${panelId}`)
        .setLabel('Sayı Gir')
        .setEmoji('✍️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`bingo_confirm_${panelId}`)
        .setLabel('Katıl')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
    )
  );

  return rows;
}

async function runCardPanel(interaction) {
  const panelId = `${interaction.user.id}${Date.now()}`;
  const modalId = `bingo_modal_${panelId}`;
  const manualId = `bingo_manual_${panelId}`;
  const confirmId = `bingo_confirm_${panelId}`;
  const card = pickCard();

  const msg = await interaction.reply({
    content:
      '🎟️ **Bingo Kartın**\n' +
      'Aşağıdaki **3x3 kart** sistem tarafından rastgele üretildi.\n' +
      'Kendi sayılarını yazmak için ✍️ **Sayı Gir**, onaylamak için ✅ **Katıl**.',
    components: buildCardRows(card, panelId),
    ephemeral: true,
    fetchReply: true,
  });

  const { confirmed, finalCard } = await new Promise((resolve) => {
    let confirmed = false;
    let finalCard = card;

    const collector = msg.createMessageComponentCollector({
      time: MODAL_TIME,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      try {
        if (i.customId === manualId) {
          try { await i.showModal(buildCardModal(modalId)); } catch (_) { return; }

          let submit;
          try {
            submit = await i.awaitModalSubmit({
              time: 90000,
              filter: (s) => s.customId === modalId && s.user.id === i.user.id,
            });
          } catch (_) { return; }

          const rows = ['bingo_row0', 'bingo_row1', 'bingo_row2'].map((id) =>
            submit.fields.getTextInputValue(id)
          );
          const parsed = parseCardInput(rows);
          if (!parsed.ok) {
            return submit.reply({ content: `❌ ${parsed.error}`, ephemeral: true }).catch(() => {});
          }

          finalCard = parsed.card;
          try { await submit.deferUpdate(); } catch (_) {}
          try { await msg.edit({ components: buildCardRows(finalCard, panelId) }); } catch (_) {}
          return;
        }

        if (i.customId === confirmId) {
          confirmed = true;
          try { await i.deferUpdate(); } catch (_) {}
          collector.stop('confirm');
        }
      } catch (e) {
        console.error('[bingo] Kart paneli hatası:', e);
      }
    });

    collector.on('end', () => resolve({ confirmed, finalCard }));
  });

  return { confirmed, card: finalCard };
}

function winningCells(card, drawnSet) {
  const cells = new Set();
  for (const line of LINES) {
    if (line.every((idx) => drawnSet.has(card[idx]))) {
      for (const idx of line) cells.add(idx);
    }
  }
  return cells;
}

function runDraw(cards) {
  const seq = shuffle(Array.from({ length: BALL_MAX }, (_, i) => i + BALL_MIN));
  const drawnSet = new Set();

  for (let i = 0; i < seq.length; i++) {
    drawnSet.add(seq[i]);
    const winners = cards.filter((c) => winningCells(c.card, drawnSet).size > 0);
    if (winners.length) {
      return { seq, winIndex: i + 1, winners: winners.map((w) => w.id) };
    }
  }
  return { seq, winIndex: seq.length, winners: cards.map((c) => c.id) };
}


const MARGIN = 28;
const CELL = 56;
const CELL_GAP = 6;
const CARD_PAD = 8;
const GRID_W = CARD_SIZE * CELL + (CARD_SIZE - 1) * CELL_GAP;
const CARD_W = GRID_W + CARD_PAD * 2;
const LABEL_H = 30;
const CARD_H = LABEL_H + GRID_W + CARD_PAD;
const CARD_GAP = 16;
const HEADER_H = 170;
const BANNER_H = 68;
const FOOTER_PAD = 14;
const MAX_COLS = 4;
const MIN_W = 800;

const SCALE = 0.68;
const PALETTE_SIZE = 128;
const MAX_DRAW_FRAMES = 30;
const SHUFFLE_FRAMES = 4;
const SHUFFLE_DELAY = 90;
const DRAW_DELAY = 125;
const PULSE_DELAY = 160;
const HOLD_MS = 3400;

function layout(count) {
  const cols = Math.min(Math.max(count, 1), MAX_COLS);
  const rows = Math.ceil(count / cols);
  const blockW = cols * CARD_W + (cols - 1) * CARD_GAP;
  const W = Math.max(blockW + MARGIN * 2, MIN_W);
  const H = MARGIN + HEADER_H + rows * CARD_H + (rows - 1) * CARD_GAP + FOOTER_PAD + BANNER_H + MARGIN;
  return {
    cols, rows, W, H, blockW,
    imgW: Math.round(W * SCALE),
    imgH: Math.round(H * SCALE),
  };
}

function drawPill(ctx, cx, y, text, fill, stroke, opts = {}) {
  const { height = 40, fontSize = 19, color = '#ffffff' } = opts;
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial`;
  const w = Math.max(ctx.measureText(text).width + 44, 150);
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
    win: { fill: '#b45309', stroke: '#fbbf24', glow: '#f59e0b', text: '#fff7ed' },
    info: { fill: '#1e3a8a', stroke: '#3b82f6', glow: '#60a5fa', text: '#eff6ff' },
  };
  const p = palette[type] || palette.win;
  const h = BANNER_H;

  ctx.save();
  ctx.shadowColor = p.glow;
  ctx.shadowBlur = 18;
  drawRoundedRect(ctx, x, y, width, h, 14, p.fill, p.stroke, 3);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  drawRoundedRect(ctx, x + 4, y + 4, width - 8, h / 2 - 2, 10);
  ctx.restore();

  ctx.fillStyle = p.text;
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + h / 2 + 2);
}

function drawBall(ctx, cx, cy, r, value) {
  const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.15, cx, cy, r * 1.05);
  grad.addColorStop(0, '#fff7cc');
  grad.addColorStop(0.45, '#f5c842');
  grad.addColorStop(1, '#b45309');

  ctx.save();
  ctx.shadowColor = 'rgba(245,200,66,0.75)';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#78350f';
  ctx.stroke();

  ctx.fillStyle = '#3a2c00';
  ctx.font = `bold ${Math.floor(r * 0.9)}px Arial Black, Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value == null ? '?' : String(value), cx, cy + 2);
}

function drawPlayerCard(ctx, player, x, y, drawnSet) {
  const hits = player.card.map((n) => drawnSet.has(n));
  const winCells = winningCells(player.card, drawnSet);
  const isWin = winCells.size > 0;

  ctx.save();
  if (isWin) {
    ctx.shadowColor = 'rgba(245,200,66,0.9)';
    ctx.shadowBlur = 20;
  }
  const box = ctx.createLinearGradient(x, y, x, y + CARD_H);
  box.addColorStop(0, isWin ? '#3b2f0b' : '#1b2138');
  box.addColorStop(1, isWin ? '#241d06' : '#0f1424');
  drawRoundedRect(ctx, x, y, CARD_W, CARD_H, 16, box, isWin ? '#f5c842' : 'rgba(148,163,184,0.25)', isWin ? 3 : 2);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = isWin ? '#f5c842' : '#cbd5e1';
  ctx.font = 'bold 17px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncate(player.name, 16), x + CARD_W / 2, y + LABEL_H / 2 + 2);
  ctx.restore();

  for (let i = 0; i < CELL_COUNT; i++) {
    const r = Math.floor(i / CARD_SIZE);
    const c = i % CARD_SIZE;
    const bx = x + CARD_PAD + c * (CELL + CELL_GAP);
    const by = y + LABEL_H + r * (CELL + CELL_GAP);

    let fill, stroke, textColor;
    if (winCells.has(i)) {
      fill = '#f5c842'; stroke = '#fff7cc'; textColor = '#3a2c00';
    } else if (hits[i]) {
      fill = '#22c55e'; stroke = '#bbf7d0'; textColor = '#06230f';
    } else {
      fill = 'rgba(15,23,42,0.85)'; stroke = 'rgba(100,116,139,0.4)'; textColor = '#94a3b8';
    }

    ctx.save();
    if (winCells.has(i)) {
      ctx.shadowColor = 'rgba(245,200,66,0.8)';
      ctx.shadowBlur = 12;
    }
    drawRoundedRect(ctx, bx, by, CELL, CELL, 10, fill, stroke, 2);
    ctx.restore();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(player.card[i]), bx + CELL / 2, by + CELL / 2 + 1);
  }
}

function drawFrame(ctx, state, L) {
  const {
    players, amount, pot,
    drawn = [], last = null,
    result = null, resultType = 'win',
  } = state;

  const W = L.W;
  const H = L.H;
  const drawnSet = new Set(drawn);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, L.imgW, L.imgH);
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);


  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#241b4d');
  bg.addColorStop(0.5, '#121828');
  bg.addColorStop(1, '#0b1020');
  drawRoundedRect(ctx, 0, 0, W, H, 24, bg, '#6366f1', 4);

  ctx.save();
  const glow = ctx.createRadialGradient(W / 2, 90, 40, W / 2, H / 2, Math.max(W, H) * 0.7);
  glow.addColorStop(0, 'rgba(99,102,241,0.16)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(24, 24, W - 48, H - 48);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 40px Arial Black, Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText('BINGO', MARGIN + 20, 46);
  ctx.fillStyle = '#f5c842';
  ctx.fillText('BINGO', MARGIN + 18, 44);

  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('ÇEKİLİŞLİ TOMBALA', MARGIN + 20, 92);
  ctx.restore();

  drawPill(ctx, W / 2 - 122, 120, `BAHİS: ${fmt(amount)}`, 'rgba(15,23,42,0.92)', '#334155', { fontSize: 18 });
  drawPill(ctx, W / 2 + 122, 120, `HAVUZ: ${fmt(pot)}`, '#6d28d9', '#4c1d95', { fontSize: 18 });

  const ballCx = W - MARGIN - 62;
  const ballCy = 90;
  const ballR = 46;
  drawBall(ctx, ballCx, ballCy, ballR, last);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 17px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${drawn.length}/${BALL_MAX}`, ballCx, ballCy + ballR + 22);

  const startY = MARGIN + HEADER_H;
  let index = 0;
  for (let r = 0; r < L.rows; r++) {
    const inRow = Math.min(L.cols, players.length - r * L.cols);
    if (inRow <= 0) break;
    const rowW = inRow * CARD_W + (inRow - 1) * CARD_GAP;
    const rowX = (W - rowW) / 2;
    for (let c = 0; c < inRow; c++) {
      const player = players[index++];
      const cx = rowX + c * (CARD_W + CARD_GAP);
      const cy = startY + r * (CARD_H + CARD_GAP);
      drawPlayerCard(ctx, player, cx, cy, drawnSet);
    }
  }

  const bannerY = H - MARGIN - BANNER_H;
  if (result) {
    drawBanner(ctx, MARGIN, bannerY, W - MARGIN * 2, truncate(result, 48), resultType);
  } else {
    drawBanner(ctx, MARGIN, bannerY, W - MARGIN * 2, `TOPLAR ÇEKİLİYOR...  ${drawn.length}/${BALL_MAX}`, 'info');
  }
}

function renderPng(state) {
  const L = layout(state.players.length);
  const canvas = createCanvas(L.imgW, L.imgH);
  const ctx = canvas.getContext('2d');
  drawFrame(ctx, state, L);
  return canvas.toBuffer('image/png');
}

async function buildBingoGif(state) {
  const L = layout(state.players.length);
  const canvas = createCanvas(L.imgW, L.imgH);
  const ctx = canvas.getContext('2d');

  const { seq, winIndex } = state;
  const winnerDrawn = seq.slice(0, winIndex);
  const lastWinnerBall = seq[winIndex - 1];

  const frames = [];

  for (let i = 0; i < SHUFFLE_FRAMES; i++) {
    frames.push({ drawn: [], last: BALL_MIN + randomInt(BALL_MAX), delay: SHUFFLE_DELAY });
  }

  const step = Math.max(1, Math.ceil(winIndex / MAX_DRAW_FRAMES));
  for (let i = step; i <= winIndex; i += step) {
    frames.push({ drawn: seq.slice(0, i), last: seq[i - 1], delay: DRAW_DELAY });
  }
  if (frames[frames.length - 1].drawn.length !== winIndex) {
    frames.push({ drawn: winnerDrawn, last: lastWinnerBall, delay: DRAW_DELAY });
  }

  for (let i = 0; i < 3; i++) {
    frames.push({ drawn: winnerDrawn, last: lastWinnerBall, delay: PULSE_DELAY });
  }

  frames.push({
    drawn: winnerDrawn, last: lastWinnerBall,
    result: state.result, resultType: 'win', delay: HOLD_MS,
  });

  const last = frames[frames.length - 1];
  drawFrame(ctx, { ...state, ...last }, L);
  const palette = quantize(ctx.getImageData(0, 0, L.imgW, L.imgH).data, PALETTE_SIZE, { format: 'rgb565' });

  const gif = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
    drawFrame(ctx, { ...state, ...fr }, L);
    const index = applyPalette(ctx.getImageData(0, 0, L.imgW, L.imgH).data, palette, 'rgb565');
    gif.writeFrame(index, L.imgW, L.imgH, i === 0
      ? { palette, delay: fr.delay, repeat: -1 }
      : { delay: fr.delay });
    if (i % 4 === 0) await delay(0);
  }
  gif.finish();

  const spinMs = frames.reduce((a, f) => a + f.delay, 0);
  return { buffer: Buffer.from(gif.bytes()), spinMs };
}

function emojiCard(player, drawnSet) {
  const rows = [];
  for (let r = 0; r < CARD_SIZE; r++) {
    const cells = [];
    for (let c = 0; c < CARD_SIZE; c++) {
      const n = player.card[r * CARD_SIZE + c];
      cells.push(`${drawnSet.has(n) ? '✅' : '⬜'}${String(n).padStart(2, '0')}`);
    }
    rows.push(cells.join(' '));
  }
  return rows.join('\n');
}


export default {
  name: 'bingo',
  category: 'games',
  aliases: ['tombala', 'bng', 'çekilişlitombala'],
  usage: '.bingo başlat <bahis|all>',
  description: 'Çekilişli Tombala! Sunucu birlikte oynar — sistem herkese rastgele 3x3 kart üretir (istersen Sayı Gir butonuyla kendin seç), 1-90 arası numara çekilir. Kartında ilk 3\'lü sırayı tamamlayan havuzun tamamını alır.',
  permissions: { enabled: false },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const hostId = message.author.id;
    const channelId = message.channel.id;

    const usage =
      '**Kullanım:**\n' +
      '`.bingo başlat 500` → 500 coin girişli bingo lobisi açar\n' +
      '`.bingo başlat all` → tüm bakiyenle lobi açar\n\n' +
      'Lobi açılır, diğerleri **Katıl** butonuyla girer (hepsi aynı giriş ücretini yatırır).\n' +
      'Katılınca sistem sana **rastgele 3x3 kart** üretir ve butonlarla gösterir.\n' +
      'İstersen **✍️ Sayı Gir** butonuyla 3 satıra 3\'er sayı yazıp kartını kendin seçebilirsin.\n' +
      'Kartında ilk **3\'lü sırayı** (yatay/dikey/çapraz) tamamlayan havuzun tamamını alır.';

    const first = String(args[0] ?? '').toLowerCase().trim();
    const hasStartKeyword = START_KEYWORDS.includes(first);
    const betRaw = (hasStartKeyword ? args[1] : args[0]) ?? '';
    const rawBet = String(betRaw).toLowerCase().trim();

    if (!rawBet || (rawBet.startsWith('<@') && !hasStartKeyword)) {
      return manager.sender.reply(manager.sender.errorEmbed(usage));
    }

    if (activeLobbies.has(channelId)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bu kanalda zaten aktif bir bingo lobisi var. Bitmesini bekle.'));
    }
    if (activeGames.has(hostId)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Zaten devam eden bir bingo oyunun var.'));
    }

    let userData = await Economy.findOne({ userId: hostId });
    if (!userData) {
      userData = new Economy({ userId: hostId });
      await userData.save().catch(() => {});
    }

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
      amount = parseInt(betRaw);
      if (isNaN(amount) || amount <= 0) {
        return manager.sender.reply(manager.sender.errorEmbed(usage));
      }
      if (amount < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Minimum giriş ücreti **${fmt(MIN_BET)}** coin.`));
      }
      if (amount > MAX_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Maksimum giriş ücreti **${fmt(MAX_BET)}** coin.`));
      }
    }

    if ((userData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Yeterli coin yok. Gereken: **${fmt(amount)}** coin.`));
    }

    const players = new Map([[hostId, { id: hostId, name: message.author.username, card: null }]]);
    const lobbyId = `${message.id}${Date.now()}`;
    let lobbyOpen = true;

    let settled = false;
    const refundAll = async () => {
      if (settled) return;
      settled = true;
      for (const p of players.values()) {
        try { await Economy.findOneAndUpdate({ userId: p.id }, { $inc: { money: amount } }); } catch (_) {}
      }
    };

    activeGames.add(hostId);
    activeLobbies.add(channelId);

    const buildLobbyEmbed = () => manager.sender.embed({
      color: manager.sender.colors.purple,
      title: 'ÇEKİLİŞLİ BİNGO — Katılım Açık!',
      description:
        `<@${hostId}> bir bingo oyunu başlattı!\n\n` +
        `**Giriş ücreti:** ${fmt(amount)} coin\n` +
        `**Havuz:** ${fmt(amount * players.size)} coin\n` +
        `**Oyuncular (${players.size}/${MAX_PLAYERS}):**\n` +
        [...players.values()].map((p, i) => `${i + 1}. <@${p.id}>${p.card ? '' : ' _(kart seçilmedi)_'}`).join('\n') +
        `\n\n**Nasıl oynanır:** Herkes 1-90 arasından **3x3 kart** yapar. Sistem top çeker; kartında **3'lü sıra** (yatay/dikey/çapraz) ilk tamamlayan havuzun tamamını alır!\n\n` +
        `**Katılmak için:** 🎟️ **Katıl** butonuna bas → sistem sana **rastgele 3x3 kart** üretir.\n` +
        `İstersen ✍️ **Sayı Gir** ile kendi sayılarını yaz, sonra ✅ **Katıl** ile onayla.\n\n` +
        `Katılmak için **60 saniye**. Kurucu, ${MIN_PLAYERS}+ oyuncu olunca **Başlat** ile hemen başlatabilir.`,
      footer: { text: `${players.size} oyuncu • Giriş: ${fmt(amount)} coin` },
    });

    const buildLobbyComponents = () => {
      const btns = new Button();
      btns.add(`bingo_join_${lobbyId}`, 'Katıl', btns.style.Success, '🎟️');
      btns.add(`bingo_start_${lobbyId}`, 'Başlat', btns.style.Primary, '▶️');
      btns.add(`bingo_cancel_${lobbyId}`, 'İptal', btns.style.Danger, '✖️');
      return [btns.build()];
    };

    try {
      try {
        await Economy.findOneAndUpdate(
          { userId: hostId },
          { $inc: { money: -amount } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
      } catch (e) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Giriş ücreti çekilirken hata oluştu.'));
      }

      let lobbyMsg;
      try {
        lobbyMsg = await message.channel.send({
          content: `<@${hostId}> **BİNGO** lobisi kurdu! Katılmak için butona bas.`,
          embeds: [buildLobbyEmbed()],
          components: buildLobbyComponents(),
        });
      } catch (e) {
        console.error('[bingo] Lobi mesajı gönderilemedi:', e?.message || e);
        await refundAll();
        try { await manager.sender.reply(manager.sender.errorEmbed('❌ Lobi oluşturulamadı. Giriş ücretin iade edildi.')); } catch (_) {}
        return;
      }

      const lobbyReason = await new Promise((resolve) => {
        const collector = lobbyMsg.createMessageComponentCollector({ time: JOIN_TIME });

        collector.on('collect', async (interaction) => {
          try {
            if (!interaction.customId.startsWith('bingo_') || !interaction.customId.endsWith(lobbyId)) return;
            const action = interaction.customId.split('_')[1];

            if (action === 'join') {
              if (!lobbyOpen) return;
              const existing = players.get(interaction.user.id);
              if (existing && existing.card) {
                return interaction.reply({ content: '❌ Zaten bu oyundasın.', ephemeral: true }).catch(() => {});
              }
              if (!existing && players.size >= MAX_PLAYERS) {
                return interaction.reply({ content: `❌ Oyun dolu (maks ${MAX_PLAYERS} oyuncu).`, ephemeral: true }).catch(() => {});
              }
              if (!existing && activeGames.has(interaction.user.id)) {
                return interaction.reply({ content: '❌ Devam eden başka bir oyunun var.', ephemeral: true }).catch(() => {});
              }

              const { confirmed, card } = await runCardPanel(interaction);
              if (!confirmed || !lobbyOpen) return;

              const already = players.get(interaction.user.id);
              if (already && already.card) return;

              if (!already) {
                const data = await Economy.findOne({ userId: interaction.user.id });
                if ((data?.money ?? 0) < amount) {
                  return interaction.editReply({
                    content: `❌ Yeterli coin yok. Giriş ücreti: **${fmt(amount)}** coin.`,
                    components: [],
                  }).catch(() => {});
                }

                try {
                  await Economy.findOneAndUpdate({ userId: interaction.user.id }, { $inc: { money: -amount } });
                } catch (_) {
                  return interaction.editReply({ content: '❌ Giriş ücreti çekilemedi.', components: [] }).catch(() => {});
                }

                players.set(interaction.user.id, { id: interaction.user.id, name: interaction.user.username, card });
                activeGames.add(interaction.user.id);
              } else {
                already.card = card;
                already.name = interaction.user.username;
              }

              try {
                await interaction.editReply({ content: '✅ Lobiye katıldın! Kartın kaydedildi.', components: [] });
              } catch (_) {}

              try {
                await lobbyMsg.edit({
                  content: `🎟️ <@${hostId}> **BİNGO** lobisi • ${players.size} oyuncu hazır!`,
                  embeds: [buildLobbyEmbed()],
                  components: buildLobbyComponents(),
                });
              } catch (_) {}
              return;
            }

            if (action === 'start') {
              if (interaction.user.id !== hostId) {
                return interaction.reply({ content: '❌ Sadece oyunu başlatan kişi başlatabilir.', ephemeral: true }).catch(() => {});
              }
              if (players.size < MIN_PLAYERS) {
                return interaction.reply({ content: `❌ En az **${MIN_PLAYERS}** oyuncu gerekli.`, ephemeral: true }).catch(() => {});
              }
              try { await interaction.deferUpdate(); } catch (_) {}
              collector.stop('start');
              return;
            }

            if (action === 'cancel') {
              if (interaction.user.id !== hostId) {
                return interaction.reply({ content: '❌ Sadece oyunu başlatan kişi iptal edebilir.', ephemeral: true }).catch(() => {});
              }
              try { await interaction.deferUpdate(); } catch (_) {}
              collector.stop('cancel');
            }
          } catch (e) {
            console.error('[bingo] Lobi etkileşim hatası:', e);
          }
        });

        collector.on('end', (_, reason) => {
          lobbyOpen = false;
          resolve(reason);
        });
      });

      if (lobbyReason === 'cancel' || players.size < MIN_PLAYERS) {
        await refundAll();
        const cancelEmbed = manager.sender.embed({
          color: manager.sender.colors.orange,
          title: '❌ Bingo İptal Edildi',
          description: lobbyReason === 'cancel'
            ? 'Kurucu oyunu iptal etti. Yatırılan tüm giriş ücretleri iade edildi.'
            : `Yeterli oyuncu katılmadı (min **${MIN_PLAYERS}**). Yatırılan tüm giriş ücretleri iade edildi.`,
          footer: { text: 'Bingo • Çekilişli Tombala' },
        });
        try { await lobbyMsg.edit({ content: '', embeds: [cancelEmbed], components: [], files: [] }); } catch (_) {}
        return;
      }

      const pot = amount * players.size;
      const cards = [...players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        card: Array.isArray(p.card) && p.card.length === CELL_COUNT ? p.card : pickCard(),
      }));
      const { seq, winIndex, winners } = runDraw(cards);
      const winnerIds = new Set(winners);
      const winnerDrawn = seq.slice(0, winIndex);
      const lastBall = seq[winIndex - 1];
      const drawnSet = new Set(winnerDrawn);

      const share = Math.floor(pot / winners.length);
      const winnerNames = cards.filter((c) => winnerIds.has(c.id)).map((c) => c.name);

      const resultText = `${winnerNames.map((n) => n.toUpperCase()).join(', ')} KAZANDI  +${fmt(share)}`;

      const baseState = {
        players: cards, amount, pot, seq, winIndex,
      };

      let gifData = null;
      try {
        gifData = await buildBingoGif({ ...baseState, result: resultText, resultType: 'win' });
      } catch (e) {
        console.error('[bingo] GIF oluşturulamadı:', e?.message || e);
      }

      let finalPng = null;
      try {
        finalPng = renderPng({ ...baseState, drawn: winnerDrawn, last: lastBall, result: resultText, resultType: 'win' });
      } catch (e) {
        console.error('[bingo] Sonuç görseli üretilemedi:', e?.message || e);
      }

      const spinEmbed = manager.sender.embed({
        color: manager.sender.colors.purple,
        title: '🎟️ BİNGO — ÇEKİLİŞ BAŞLIYOR',
        description:
          `💰 Bahis: **${fmt(amount)}** coin  •  🏆 Havuz: **${fmt(pot)}** coin\n` +
          `👥 **${players.size}** oyuncu  •  Toplar çekiliyor...\n\n` +
          cards.map((c) => `▫️ <@${c.id}>`).join('\n'),
        image: gifData ? 'attachment://bingo.gif' : (finalPng ? 'attachment://bingo_result.png' : undefined),
        footer: { text: 'Bingo • 1-90 arası numara çekilir' },
      });

      let posted = false;
      if (gifData) {
        try {
          await lobbyMsg.edit({
            content: '',
            embeds: [spinEmbed],
            components: [],
            files: [new AttachmentBuilder(gifData.buffer, { name: 'bingo.gif' })],
          });
          posted = true;
        } catch (e) {
          console.error('[bingo] GIF mesajı güncellenemedi:', e?.message || e);
        }
      }
      if (!posted && finalPng) {
        try {
          await lobbyMsg.edit({
            content: '',
            embeds: [spinEmbed],
            components: [],
            files: [new AttachmentBuilder(finalPng, { name: 'bingo_result.png' })],
          });
          posted = true;
        } catch (e) {
          console.error('[bingo] Görsel mesajı güncellenemedi:', e?.message || e);
        }
      }
      if (!posted) {
        try {
          await lobbyMsg.edit({ content: '', embeds: [spinEmbed], components: [] });
          posted = true;
        } catch (e) {
          console.error('[bingo] Mesaj güncellenemedi:', e?.message || e);
        }
      }

      if (!posted) {
        await refundAll();
        return;
      }

      // Ödemeler
      settled = true;
      try {
        for (const c of cards) {
          if (winnerIds.has(c.id)) {
            await Economy.findOneAndUpdate({ userId: c.id }, { $inc: { money: share, xp: 25 } }, { new: true });
            gameStatsHelper.recordGame(message.guild.id, c.id, 'bingo', { play: 1, win: 1, won: share - amount });
          } else {
            await Economy.findOneAndUpdate({ userId: c.id }, { $inc: { xp: 5 } }, { new: true });
            gameStatsHelper.recordGame(message.guild.id, c.id, 'bingo', { play: 1, loss: 1, lost: amount });
          }
        }
      } catch (e) {
        console.error('[bingo] Ödeme hatası:', e);
      }

      const cardBlock = cards.map((c) => {
        const isWinner = winnerIds.has(c.id);
        return `${isWinner ? '🏆' : '▫️'} **${c.name}**${isWinner ? ' — KAZANDI' : ''}\n\`\`\`\n${emojiCard(c, drawnSet)}\n\`\`\``;
      }).join('\n');

      const finalEmbed = manager.sender.embed({
        color: manager.sender.colors.gold,
        title: '🏆 BİNGO — KAZANAN BELLİ OLDU!',
        description:
          `💰 **Bahis:** ${fmt(amount)} coin  •  🏆 **Havuz:** ${fmt(pot)} coin\n` +
          `🎯 **Kazanan çekiliş:** ${winIndex}. top  •  🔢 **Son sayı:** ${lastBall}\n` +
          `👑 **Kazanan:** ${[...winnerIds].map((id) => `<@${id}>`).join(', ')}  →  **+${fmt(share)}** coin${winners.length > 1 ? ` _(havuz ${winners.length} kişiye bölündü)_` : ''}\n\n` +
          `✅ işaretli sayılar çekildi • 🟡 kazanan sıra\n\n` +
          cardBlock,
        image: finalPng ? 'attachment://bingo_result.png' : undefined,
        footer: { text: 'Bingo • Çekilişli Tombala' },
      });

      if (gifData) await delay(gifData.spinMs);

      const finalPayload = {
        content: '',
        embeds: [finalEmbed],
        components: [],
        files: finalPng ? [new AttachmentBuilder(finalPng, { name: 'bingo_result.png' })] : [],
        attachments: [],
      };

      try {
        await lobbyMsg.edit(finalPayload);
      } catch (e) {
        console.error('[bingo] Sonuç güncellenemedi:', e?.message || e);
        try { await lobbyMsg.edit({ content: '', embeds: [finalEmbed], components: [], files: [], attachments: [] }); } catch (_) {}
      }
    } catch (error) {
      console.error('[bingo] Oyun hatası:', error);
      await refundAll();
      try {
        await manager.sender.reply(manager.sender.errorEmbed('❌ Oyun sırasında hata oluştu. Giriş ücretleri iade edildi.'));
      } catch (_) {}
    } finally {
      for (const p of players.values()) activeGames.delete(p.id);
      activeLobbies.delete(channelId);
    }
  },
};
