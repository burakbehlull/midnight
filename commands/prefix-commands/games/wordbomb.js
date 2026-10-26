import Manager from '#managers';
import { Economy } from '#models';
import { Button, misc, gameStatsHelper } from '#helpers';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createCanvas } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

const { drawRoundedRect } = misc;

const MIN_BET = 100;
const MAX_BET = 50000;
const ALL_KEYWORDS = ['all', 'max', 'tüm', 'hepsi'];

const START_TIME = 10;
const MIN_TIME = 3;
const HEARTS_START = 2;
const SYLLABLE_LEN = 2;
const MIN_WORDS_PER_SYLLABLE = 40;
const MIN_WORD_LEN = 3;
const MAX_WORD_LEN = 24;

const FALLBACK_SYLLABLES = [
  'ka', 'kı', 'ke', 'ki', 'ko', 'kö', 'ku', 'kü',
  'ba', 'bı', 'be', 'bi', 'bo', 'bu', 'bü',
  'sa', 'sı', 'se', 'si', 'so', 'sö', 'su', 'sü',
  'ma', 'me', 'mı', 'mi', 'ta', 'te', 'tı', 'ti',
  'da', 'de', 'dı', 'di', 'ya', 'ye', 'yı', 'yi',
  'na', 'ne', 'nı', 'ni', 'ra', 're', 'rı', 'ri',
  'la', 'le', 'lı', 'li', 'ça', 'çe', 'çı', 'çi',
  'şa', 'şe', 'şı', 'şi', 'ğa', 'ğe', 'ğı', 'ği',
  'ar', 'er', 'ır', 'ir', 'or', 'ör', 'ur', 'ür',
  'an', 'en', 'ın', 'in', 'on', 'ön', 'un', 'ün',
  'al', 'el', 'ıl', 'il', 'ol', 'öl', 'ul', 'ül',
];

const activeGames = new Set();

function fmt(n) {
  return Math.floor(n).toLocaleString('tr-TR');
}

function truncate(str, n) {
  const s = String(str ?? '');
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z]/g, '');
}

const TURKISH_VOWELS = 'aeıioöuü';
const TURKISH_LETTERS = /^[a-zçğıöşü]+$/;

function trLower(text) {
  return String(text).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

function trUpper(text) {
  return String(text).toLocaleUpperCase('tr-TR');
}

function matchFold(text) {
  return trLower(text)
    .replace(/[^a-zçğıöşü]/g, '')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u');
}

function startsWithSyllable(word, syllable) {
  return matchFold(word).startsWith(matchFold(syllable));
}


let wordsSet = null;

function loadWords() {
  if (!wordsSet) {
    try {
      const content = readFileSync(join(process.cwd(), 'data', 'words.txt'), 'utf-8');
      wordsSet = new Set(
        content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.includes(' '))
          .map(normalizeText)
          .filter((w) => w.length >= MIN_WORD_LEN)
      );
    } catch (err) {
      console.error('[wordbomb] words.txt yüklenemedi:', err);
      wordsSet = new Set();
    }
  }
  return wordsSet;
}

let rawWordsCache = null;

function loadRawWords() {
  if (!rawWordsCache) {
    try {
      const content = readFileSync(join(process.cwd(), 'data', 'words.txt'), 'utf-8');
      rawWordsCache = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.includes(' '))
        .map(trLower);
    } catch (err) {
      console.error('[wordbomb] words.txt (ham) yüklenemedi:', err);
      rawWordsCache = [];
    }
  }
  return rawWordsCache;
}

let syllablePool = null;

function getSyllablePool() {
  if (!syllablePool) {
    const counts = new Map();

    for (const w of loadRawWords()) {
      if (w.length < SYLLABLE_LEN + 1) continue;
      const pre = w.slice(0, SYLLABLE_LEN);
      if (!TURKISH_LETTERS.test(pre)) continue;

      const aVowel = TURKISH_VOWELS.includes(pre[0]);
      const bVowel = TURKISH_VOWELS.includes(pre[1]);
      if (aVowel === bVowel) continue;

      counts.set(pre, (counts.get(pre) || 0) + 1);
    }

    const pool = [...counts.entries()]
      .filter(([, c]) => c >= MIN_WORDS_PER_SYLLABLE)
      .map(([s]) => s)
      .sort();

    syllablePool = pool.length ? pool : FALLBACK_SYLLABLES;
  }
  return syllablePool;
}

function randomSyllable() {
  const pool = getSyllablePool();
  return pool[Math.floor(Math.random() * pool.length)];
}

async function isValidWord(word) {
  const norm = normalizeText(word);
  if (loadWords().has(norm)) return true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://freedictionaryapi.com/api/v1/entries/tr/${encodeURIComponent(word.toLowerCase())}`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      }
    );

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.entries) && data.entries.length > 0;
    }
    return null;
  } catch {
    return null;
  }
}

const CARD_W = 780;
const CARD_H = 640;

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

function drawBanner(ctx, x, y, width, text, type = 'lose') {
  const palette = {
    win:  { fill: '#2e7d32', stroke: '#1b5e20', glow: '#4caf50', text: '#ffffff' },
    lose: { fill: '#c62828', stroke: '#8b0000', glow: '#f44336', text: '#ffffff' },
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
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + h / 2 + 2);
}

function drawHeart(ctx, cx, cy, size, filled = true) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.62);
  ctx.bezierCurveTo(cx - size * 1.15, cy - size * 0.18, cx - size * 0.62, cy - size * 0.95, cx, cy - size * 0.32);
  ctx.bezierCurveTo(cx + size * 0.62, cy - size * 0.95, cx + size * 1.15, cy - size * 0.18, cx, cy + size * 0.62);
  ctx.closePath();

  if (filled) {
    const g = ctx.createLinearGradient(cx, cy - size, cx, cy + size);
    g.addColorStop(0, '#ff6b6b');
    g.addColorStop(1, '#dc2626');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#7f1d1d';
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#475569';
    ctx.stroke();
  }
  ctx.restore();
}


function drawPlayerBar(ctx, cx, y, name, hearts, total, isActive) {
  const w = 332;
  const h = 54;
  const x = cx - w / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  drawRoundedRect(
    ctx, x, y, w, h, 14,
    isActive ? '#1d4ed8' : 'rgba(15,23,42,0.92)',
    isActive ? '#60a5fa' : '#334155',
    isActive ? 3 : 2
  );
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncate(name, 13), x + 16, y + h / 2 + 1);
  ctx.restore();

  const hs = 14;
  const gap = 30;
  const startX = x + w - 30 - (total - 1) * gap;
  for (let i = 0; i < total; i++) {
    drawHeart(ctx, startX + i * gap, y + h / 2, hs, i < hearts);
  }
}

function drawBomb(ctx, cx, cy, r) {

  ctx.save();
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.4, cy - r * 0.8);
  ctx.quadraticCurveTo(cx + r * 1.02, cy - r * 1.22, cx + r * 0.6, cy - r * 1.6);
  ctx.stroke();
  ctx.restore();

  // Kıvılcım
  const kx = cx + r * 0.6;
  const ky = cy - r * 1.6;
  const glow = ctx.createRadialGradient(kx, ky, 0, kx, ky, 32);
  glow.addColorStop(0, '#fffde7');
  glow.addColorStop(0.35, '#ffca28');
  glow.addColorStop(0.7, 'rgba(255,138,0,0.55)');
  glow.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(kx, ky, 32, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.restore();

  drawRoundedRect(ctx, cx - r * 0.26, cy - r * 1.06, r * 0.52, r * 0.34, 6, '#4b5563', '#111827', 3);

 
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
  body.addColorStop(0, '#6b7280');
  body.addColorStop(0.45, '#1f2937');
  body.addColorStop(1, '#0b1220');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.save();
  const shine = ctx.createRadialGradient(
    cx - r * 0.4, cy - r * 0.45, r * 0.05,
    cx - r * 0.4, cy - r * 0.45, r * 0.95
  );
  shine.addColorStop(0, 'rgba(255,255,255,0.3)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = shine;
  ctx.fill();
  ctx.restore();
}

function drawExplosion(ctx, cx, cy, r) {
  const spikes = 12;
  const outer = r * 1.55;
  const inner = r * 0.72;

  ctx.save();
  ctx.translate(cx, cy);
  const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, outer);
  grad.addColorStop(0, '#fffde7');
  grad.addColorStop(0.4, '#ffca28');
  grad.addColorStop(0.75, '#f97316');
  grad.addColorStop(1, 'rgba(239,68,68,0.15)');

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (Math.PI / spikes) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? outer : inner;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 44px Arial Black, Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillText('BOOM!', cx + 2, cy + 5);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BOOM!', cx, cy + 3);
  ctx.restore();
}

function renderBombCard(state) {
  const {
    syllable = 'ka', amount = 0, pot = 0,
    currentName = '', turn = 1, wordCount = 0,
    timeLeft = START_TIME, words = [],
    status = 'active', result = null, resultType = 'lose',
    players = [], totalHearts = HEARTS_START,
  } = state;

  const W = CARD_W;
  const H = CARD_H;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const isBoom = status === 'boom';


  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  if (isBoom) {
    bg.addColorStop(0, '#991b1b');
    bg.addColorStop(0.5, '#7f1d1d');
    bg.addColorStop(1, '#3b0a0a');
  } else {
    bg.addColorStop(0, '#1f2937');
    bg.addColorStop(1, '#0b1220');
  }
  drawRoundedRect(ctx, 0, 0, W, H, 26, bg, isBoom ? '#f87171' : '#334155', 4);
  ctx.restore();


  const pad = 20;
  ctx.save();
  const inner = ctx.createLinearGradient(0, pad, 0, H - pad);
  if (isBoom) {
    inner.addColorStop(0, 'rgba(120,20,20,0.85)');
    inner.addColorStop(1, 'rgba(60,10,10,0.92)');
  } else {
    inner.addColorStop(0, 'rgba(30,41,59,0.92)');
    inner.addColorStop(1, 'rgba(15,23,42,0.96)');
  }
  drawRoundedRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 20, inner, isBoom ? '#b91c1c' : '#1e293b', 3);
  ctx.restore();


  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 40px Arial Black, Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText('KELİME BOMBASI', W / 2 + 2, 44);
  ctx.fillStyle = '#f5c842';
  ctx.fillText('KELİME BOMBASI', W / 2, 42);
  ctx.restore();


  drawPill(ctx, 152, 96, `BAHİS: ${fmt(amount)}`, 'rgba(15,23,42,0.9)', '#334155', { fontSize: 18 });
  drawPill(ctx, W - 152, 96, `HAVUZ: ${fmt(pot)}`, '#6d28d9', '#4c1d95', { fontSize: 18 });


  const syll = trUpper(syllable);
  ctx.save();
  ctx.font = 'bold 64px Arial Black, Arial';
  const sw = Math.max(ctx.measureText(syll).width + 84, 220);
  const sx = W / 2 - sw / 2;
  const sy = 152;
  ctx.shadowColor = 'rgba(245,200,66,0.55)';
  ctx.shadowBlur = 18;
  drawRoundedRect(ctx, sx, sy, sw, 92, 18, '#0f172a', '#f5c842', 3);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 64px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(syll, W / 2, sy + 48);
  ctx.restore();


  const bombCx = W / 2;
  const bombCy = 396;
  const bombR = 82;
  if (isBoom) drawExplosion(ctx, bombCx, bombCy, bombR);
  else drawBomb(ctx, bombCx, bombCy, bombR);


  if (!isBoom && players.length) {
    drawPlayerBar(ctx, W / 2 - 194, 498, players[0].name, players[0].hearts, totalHearts, players[0].active);
    drawPlayerBar(ctx, W / 2 + 194, 498, players[1].name, players[1].hearts, totalHearts, players[1].active);
  }


  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`⏱ ${timeLeft} sn   •   TUR ${turn}   •   KELİME ${wordCount}`, W / 2, 572);
  ctx.restore();


  if (words.length) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(148,163,184,0.95)';
    ctx.fillText(truncate(words.slice(-6).join('  →  '), 74), W / 2, 606);
    ctx.restore();
  }

  if (result) drawBanner(ctx, W / 2 - 300, 486, 600, truncate(result, 40), resultType);

  return canvas.toBuffer('image/png');
}

function bombAttachment(state) {
  return new AttachmentBuilder(renderBombCard(state), { name: 'wordbomb.png' });
}

function buildTextEmbed(manager, state) {
  const {
    syllable, amount, pot, currentName, turn, wordCount,
    timeLeft, words, status, reason,
    players = [], totalHearts = HEARTS_START,
  } = state;
  const isBoom = status === 'boom';

  const heartsLine = (p) =>
    `${'❤️'.repeat(Math.max(0, p.hearts))}${'🖤'.repeat(Math.max(0, totalHearts - p.hearts))} ${p.name}`;

  const lines = [
    `**HECE:** \`${trUpper(syllable)}\``,
    `**BAHİS:** ${fmt(amount)} coin  •  **HAVUZ:** ${fmt(pot)} coin`,
  ];

  if (players.length) lines.push('', players.map(heartsLine).join('  •  '));

  lines.push('', `⏱ **${timeLeft} sn**  •  Tur **${turn}**  •  Kelime **${wordCount}**`);

  if (isBoom) {
    lines.push('', '💥 **PATLAMA!**', reason ? `Sebep: ${reason}` : null);
  } else {
    lines.push('', `🎯 **Sıra:** ${currentName}`, `\`${trUpper(syllable)}\` ile başlayan bir kelime yaz!`);
  }

  if (words.length) lines.push('', `📜 ${words.slice(-8).join(' → ')}`);

  return manager.sender.embed({
    color: isBoom ? manager.sender.colors.liveRed : manager.sender.colors.blue,
    title: isBoom ? '💣 KELİME BOMBASI — BOOM!' : '💣 KELİME BOMBASI',
    description: lines.filter(Boolean).join('\n'),
    footer: { text: `Havuz: ${fmt(pot)} coin • Hece: ${trUpper(syllable)}` },
  });
}


export default {
  name: 'wordbomb',
  category: 'games',
  aliases: ['kelimebombasi', 'kelimebombası', 'bombabasi', 'bombab', 'bomba', 'wb'],
  usage: '.wordbomb @kullanıcı <bahis|all>',
  description: 'Kelime Bombası! Rastgele bir hece verilir ve sırayla o heceyle başlayan kelime yazarsın. Yazamayan ya da geçersiz/tekrar kelime yazan patlar!',
  permissions: { enabled: false },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const challenger = message.author;

    const targetUser = message.mentions.users.first() || client.users.cache.get(args[0]);
    const rawAmount = args[1];

    if (!targetUser) {
      return manager.sender.reply(manager.sender.errorEmbed(
        '**Kullanım:**\n' +
        '`.wordbomb @kullanıcı 500`\n' +
        '`.wordbomb @kullanıcı all` → tüm bakiyenle oyna\n\n' +
        'Rastgele bir hece verilir, sırayla o heceyle başlayan kelime yazarsın. Yazamayan patlar!'
      ));
    }

    if (targetUser.id === challenger.id) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Kendinle Kelime Bombası oynayamazsın.'));
    }
    if (targetUser.bot) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Botlarla Kelime Bombası oynayamazsın.'));
    }

    let challengerData = await Economy.findOne({ userId: challenger.id });
    let targetData = await Economy.findOne({ userId: targetUser.id });

    if (!challengerData) {
      challengerData = new Economy({ userId: challenger.id });
      await challengerData.save().catch(() => {});
    }
    if (!targetData) {
      targetData = new Economy({ userId: targetUser.id });
      await targetData.save().catch(() => {});
    }

    const raw = String(rawAmount ?? '').toLowerCase().trim();
    let amount;

    if (ALL_KEYWORDS.includes(raw)) {
      const balance = challengerData.money ?? 0;
      amount = Math.min(balance, MAX_BET);
      if (amount < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(
          `❌ All modu için bakiyen en az **${fmt(MIN_BET)}** coin olmalı. Mevcut: **${fmt(balance)}** coin`
        ));
      }
    } else {
      amount = parseInt(raw);
      if (isNaN(amount) || amount <= 0) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir bahis belirt. Örn: `.wordbomb @kişi 500`'));
      }
      if (amount < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Minimum bahis **${fmt(MIN_BET)}** coin.`));
      }
      if (amount > MAX_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Maksimum bahis **${fmt(MAX_BET)}** coin.`));
      }
    }

    if ((challengerData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Senin bakiyen yetersiz. Gereken: **${fmt(amount)}** coin.`));
    }
    if ((targetData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Rakibin bakiyesi yetersiz. Gereken: **${fmt(amount)}** coin.`));
    }

    if (activeGames.has(challenger.id) || activeGames.has(targetUser.id)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Sen veya rakibin zaten aktif bir oyunda.'));
    }

    activeGames.add(challenger.id);
    activeGames.add(targetUser.id);

    const gameId = `${challenger.id}_${targetUser.id}_${Date.now()}`;

    const buttons = new Button();
    buttons.add(`wb_accept_${gameId}`, 'Kabul Et', buttons.style.Success, '✅', false);
    buttons.add(`wb_reject_${gameId}`, 'Reddet', buttons.style.Danger, '❌', false);

    const offerEmbed = manager.sender.embed({
      color: manager.sender.colors.blue,
      title: '💣 Kelime Bombası Teklifi',
      description:
        `<@${challenger.id}> sana **${fmt(amount)}** coin'lik Kelime Bombası teklif etti!\n\n` +
        `📜 **Kurallar:**\n` +
        `• Rastgele bir hece verilir (ör. \`KA\`)\n` +
        `• Sırayla o heceyle başlayan geçerli kelime yazarsın (\`KA-RAN\`, \`KA-PI\`)\n` +
        `• Süre her turda kısalır ⏱ (${START_TIME} sn'den başlar)\n` +
        `• Süre dolunca ya da geçersiz/tekrar kelime yazınca **patlarsın** 💥\n` +
        `• Patlamayan oyuncu **${fmt(amount * 2)}** coin'lik havuzu alır\n\n` +
        `**Bahis:** ${fmt(amount)} coin  •  **Havuz:** ${fmt(amount * 2)} coin\n\n` +
        `Kabul ediyor musun? (30 saniye)`,
      footer: { text: `<@${targetUser.id}> kabul etmeli` },
    });

    let offerMsg;
    try {
      offerMsg = await message.channel.send({
        content: `<@${targetUser.id}>`,
        embeds: [offerEmbed],
        components: [buttons.build()],
      });
    } catch (e) {
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }

    let accepted = false;
    try {
      const interaction = await offerMsg.awaitMessageComponent({
        filter: (i) =>
          (i.customId === `wb_accept_${gameId}` || i.customId === `wb_reject_${gameId}`) &&
          i.user.id === targetUser.id,
        time: 30_000,
      });

      try { await interaction.deferUpdate(); } catch (_) {}

      if (interaction.customId === `wb_reject_${gameId}`) {
        const rejectEmbed = manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '❌ Teklif Reddedildi',
          description: `<@${targetUser.id}> Kelime Bombası teklifini reddetti.`,
        });
        try { await offerMsg.edit({ embeds: [rejectEmbed], components: [], content: '' }); } catch (_) {}
        activeGames.delete(challenger.id);
        activeGames.delete(targetUser.id);
        return;
      }
      accepted = true;
    } catch (e) {
      const timeoutEmbed = manager.sender.embed({
        color: manager.sender.colors.orange,
        title: '⏰ Süre Bitti',
        description: `<@${targetUser.id}> 30 saniye içinde cevap vermedi, teklif iptal edildi.`,
      });
      try { await offerMsg.edit({ embeds: [timeoutEmbed], components: [], content: '' }); } catch (_) {}
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }

    if (!accepted) return;

    try {
      await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: -amount } });
      await Economy.findOneAndUpdate({ userId: targetUser.id }, { $inc: { money: -amount } });
    } catch (e) {
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bahis çekimi sırasında hata oluştu.'));
    }

    const pot = amount * 2;
    const players = [challenger, targetUser];
    const starterIndex = Math.random() < 0.5 ? 0 : 1;
    const usedWords = new Set();
    const wordHistory = [];
    let syllable = '';

    // Her oyuncunun canı (kalbi)
    const hearts = new Map([[challenger.id, HEARTS_START], [targetUser.id, HEARTS_START]]);
    const buildPlayersState = (activeId = null) =>
      players.map((p) => ({
        name: p.username,
        hearts: hearts.get(p.id),
        active: p.id === activeId,
      }));

    let loser = null;
    let boomReason = 'Süre doldu';
    let turn = 0;
    let gameMsg = null;
    let visualOk = true;

    const refundBoth = async () => {
      try {
        await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: amount } });
        await Economy.findOneAndUpdate({ userId: targetUser.id }, { $inc: { money: amount } });
      } catch (_) {}
    };

    const showFrame = async (state, content) => {
      if (visualOk) {
        try {
          if (!gameMsg) {
            gameMsg = await message.channel.send({ content, files: [bombAttachment(state)] });
          } else {
            await gameMsg.edit({ content, files: [bombAttachment(state)] });
          }
          return;
        } catch (e) {
          visualOk = false;
          console.error('[wordbomb] Görsel gönderilemedi, metin moduna geçiliyor:', e?.message || e);
        }
      }

      const embed = buildTextEmbed(manager, state);
      if (!gameMsg) gameMsg = await message.channel.send({ embeds: [embed] });
      else await gameMsg.edit({ content: '', embeds: [embed], attachments: [] });
    };

    try {
      while (!loser) {
        turn++;

        let next = randomSyllable();
        let guard = 0;
        while (next === syllable && guard++ < 25) next = randomSyllable();
        syllable = next;

        const timeSec = Math.max(MIN_TIME, START_TIME - (turn - 1));

        const firstIdx = (turn - 1 + starterIndex) % 2;
        const turnOrder = [players[firstIdx], players[(firstIdx + 1) % 2]];

        let failedPlayer = null;
        let failReason = 'Süre doldu';
        let failMsg = null;

        for (const current of turnOrder) {
          const deadline = Date.now() + timeSec * 1000;

          const state = {
            syllable, amount, pot,
            currentName: current.username,
            turn,
            wordCount: usedWords.size,
            timeLeft: timeSec,
            words: wordHistory,
            status: 'active',
            players: buildPlayersState(current.id),
            totalHearts: HEARTS_START,
          };

          const content =
            `💣 <@${current.id}> **sıra sende!** \`${trUpper(syllable)}\` ile başlayan bir kelime yaz. (${timeSec} sn)`;

          await showFrame(state, content);

          let outcome = null;

          while (Date.now() < deadline && !outcome) {
            let collected;
            try {
              collected = await message.channel.awaitMessages({
                filter: (m) => m.author.id === current.id && !m.content.startsWith('.'),
                max: 1,
                time: Math.max(1000, deadline - Date.now()),
                errors: ['time'],
              });
            } catch {
              outcome = { type: 'timeout' };
              break;
            }

            const userMsg = collected.first();
            const rawText = userMsg.content.trim();
            const norm = normalizeText(rawText);
            const tokens = rawText.split(/\s+/).filter(Boolean);

            if (tokens.length !== 1 || norm.length < MIN_WORD_LEN || norm.length > MAX_WORD_LEN) {
              userMsg.react('❌').catch(() => {});
              const warn = await userMsg
                .reply({
                  content: `⚠️ Tek bir kelime yaz: \`${trUpper(syllable)}\` ile başlayan, en az ${MIN_WORD_LEN} harfli.`,
                  allowedMentions: { repliedUser: false },
                })
                .catch(() => null);
              setTimeout(() => {
                userMsg.delete().catch(() => {});
                warn?.delete().catch(() => {});
              }, 4000);
              continue;
            }

            if (!startsWithSyllable(rawText, syllable)) {
              outcome = { type: 'fail', reason: `Kelime \`${trUpper(syllable)}\` ile başlamalı.`, msg: userMsg };
              break;
            }

            if (usedWords.has(norm)) {
              outcome = { type: 'fail', reason: 'Bu kelime zaten yazıldı.', msg: userMsg };
              break;
            }

            const valid = await isValidWord(rawText);
            if (valid === false) {
              outcome = { type: 'fail', reason: 'Bu kelime sözlükte bulunamadı.', msg: userMsg };
              break;
            }

            userMsg.react('✅').catch(() => {});
            outcome = { type: 'word', norm, raw: rawText };
            break;
          }

          if (!outcome) outcome = { type: 'timeout' };

          if (outcome.type !== 'word') {
            failedPlayer = current;
            failReason = outcome.reason || 'Süre doldu';
            failMsg = outcome.msg || null;
            break; 
          }

          usedWords.add(outcome.norm);
          wordHistory.push(outcome.raw || outcome.norm);
        }

        if (!failedPlayer) continue;

        const remaining = Math.max(0, hearts.get(failedPlayer.id) - 1);
        hearts.set(failedPlayer.id, remaining);

        if (failMsg) {
          failMsg.react('❌').catch(() => {});
          setTimeout(() => failMsg.delete().catch(() => {}), 5000);
        }

        if (remaining <= 0) {
          loser = failedPlayer;
          boomReason = failReason;
          break;
        }

        const hitEmbed = manager.sender.embed({
          color: manager.sender.colors.orange,
          title: '💔 Kalp Gitti',
          description:
            `<@${failedPlayer.id}> heceyi geçemedi ve **1 kalp** kaybetti. (${failReason})\n` +
            `Kalan kalp: ${'❤️'.repeat(remaining)}${'🖤'.repeat(Math.max(0, HEARTS_START - remaining))}`,
        });
        try { await message.channel.send({ embeds: [hitEmbed] }); } catch (_) {}
      }

      const winner = players.find((p) => p.id !== loser.id);

      
      try {
        await Economy.findOneAndUpdate(
          { userId: winner.id },
          { $inc: { money: pot, xp: 30 } },
          { new: true }
        );
        await Economy.findOneAndUpdate(
          { userId: loser.id },
          { $inc: { xp: 5 } },
          { new: true }
        );
      } catch (e) {
        console.error('[wordbomb] Ödül verme hatası:', e);
      }

      gameStatsHelper.recordGame(message.guild.id, winner.id, 'wordbomb', { play: 1, win: 1, won: pot - amount });
      gameStatsHelper.recordGame(message.guild.id, loser.id, 'wordbomb', { play: 1, loss: 1, lost: amount });

      const boomState = {
        syllable, amount, pot,
        currentName: loser.username,
        turn,
        wordCount: usedWords.size,
        timeLeft: 0,
        words: wordHistory,
        status: 'boom',
        reason: boomReason,
        result: `${loser.username} PATLADI • ${winner.username} KAZANDI`,
        resultType: 'lose',
        players: buildPlayersState(null),
        totalHearts: HEARTS_START,
      };

      const finalContent =
        `💥 <@${loser.id}> **tüm kalplerini kaybetti!** (son: ${boomReason})\n` +
        `🏆 <@${winner.id}> **kazandı** ve **${fmt(pot)}** coin aldı!\n` +
        `Oyun boyunca toplam **${usedWords.size}** geçerli kelime yazıldı.`;

      try {
        await showFrame(boomState, finalContent);
      } catch (e) {
        console.error('[wordbomb] Sonuç gösterilemedi:', e?.message || e);
      }
    } catch (e) {
      console.error('[wordbomb] Oyun hatası:', e);
      await refundBoth();
      try {
        await manager.sender.reply(manager.sender.errorEmbed('❌ Oyun sırasında hata oluştu. Bahisler iade edildi.'));
      } catch (_) {}
    } finally {
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
    }
  },
};
