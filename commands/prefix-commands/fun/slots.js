import Manager from '#managers';
import { Economy } from '#models';
import { misc } from '#helpers';

const { delay } = misc;

const TIER_EMOJIS = {
  tier1: ['🐢', '🐛', '🐌', '🐞', '🦇', '🦂'],
  tier2: ['🐓', '🐖', '🦀', '🐙', '🐿️', '🐪'],
  tier3: ['🦒', '🐘', '🐬'],
  tier4: ['🦄', '🐉'],
  tier5: ['💷'],
};

const TIER_MULTIPLIERS = {
  tier1: 2.0,
  tier2: 2.6,
  tier3: 3.5,
  tier4: 4.5,
  tier5: 6.0,
};

const TIER_NAMES = {
  tier1: 'Yaygın',
  tier2: 'Normal',
  tier3: 'Nadir',
  tier4: 'Efsane',
  tier5: 'JACKPOT',
};

const TIER_WEIGHTS = {
  tier1: 18,
  tier2: 30,
  tier3: 30,
  tier4: 17,
  tier5: 5,
};

const PAIR_MULTIPLIERS = {
  tier1: 0.9,
  tier2: 1.2,
  tier3: 1.6,
  tier4: 2.0,
  tier5: 2.6,
};

const NO_MATCH_REFUND_RATE = 0.4;

const ALL_EMOJIS = [
  ...TIER_EMOJIS.tier1,
  ...TIER_EMOJIS.tier2,
  ...TIER_EMOJIS.tier3,
  ...TIER_EMOJIS.tier4,
  ...TIER_EMOJIS.tier5,
];

const EMOJI_TO_TIER = {};
for (const [tier, emojis] of Object.entries(TIER_EMOJIS)) {
  for (const e of emojis) EMOJI_TO_TIER[e] = tier;
}

const MIN_BET = 50;
const MAX_BET = 50000;

function weightedPickEmoji() {
  const totalWeight = Object.values(TIER_WEIGHTS).reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;
  let pickedTier = 'tier1';
  for (const [tier, w] of Object.entries(TIER_WEIGHTS)) {
    if (rand < w) { pickedTier = tier; break; }
    rand -= w;
  }
  const pool = TIER_EMOJIS[pickedTier];
  return pool[Math.floor(Math.random() * pool.length)];
}

function spinReels() {
  return [
    weightedPickEmoji(),
    weightedPickEmoji(),
    weightedPickEmoji(),
  ];
}

export default {
  name: 'slots',
  category: 'fun',
  aliases: ['slot', 's'],
  usage: '.slots <bahisMiktarı>',
  description: 'Slot makinesi çevir, hayvanlar eşleşirse kazanırsın!',
  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;

    const amount = parseInt(args[0]);

    if (isNaN(amount) || amount <= 0) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Geçerli bir bahis miktarı belirt. Kullanım: \`.slots 500\``));
    }

    if (amount < MIN_BET) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Minimum bahis miktarı **${MIN_BET}** coin.`));
    }

    if (amount > MAX_BET) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Maksimum bahis miktarı **${MAX_BET.toLocaleString('tr-TR')}** coin.`));
    }

    let userData = await Economy.findOne({ userId });
    if (!userData) {
      userData = new Economy({ userId });
      await userData.save().catch(() => {});
    }

    if ((userData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Yeterli coin yok. Gereken: **${amount}** coin.`));
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

    const finalReels = spinReels();
    const displayReels = ['❓', '❓', '❓'];

    const header = `──── **SLOTS** ────\n`;
    const line = (r) => `| ${r[0]} | ${r[1]} | ${r[2]} |`;

    const buildOutput = (r, extra = '') => {
      return `${header}${line(r)}\n${extra ? `\n${extra}` : ''}`;
    };

    let spinMsg;
    try {
      spinMsg = await message.channel.send({
        content: `${message.author}, bet ${amount.toLocaleString('tr-TR')} coin ile oynuyor...\n${buildOutput(displayReels)}`
      });
    } catch (e) {
      return;
    }

    await delay(500);
    displayReels[0] = finalReels[0];
    try { await spinMsg.edit({ content: `${message.author}, bet ${amount.toLocaleString('tr-TR')} coin ile oynuyor...\n${buildOutput(displayReels)}` }); } catch (_) {}

    await delay(500);
    displayReels[1] = finalReels[1];
    try { await spinMsg.edit({ content: `${message.author}, bet ${amount.toLocaleString('tr-TR')} coin ile oynuyor...\n${buildOutput(displayReels)}` }); } catch (_) {}

    await delay(500);
    displayReels[2] = finalReels[2];

    let matchedEmoji = null;
    let matchedCount = 0;

    if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
      matchedEmoji = finalReels[0];
      matchedCount = 3;
    } else if (finalReels[0] === finalReels[1]) {
      matchedEmoji = finalReels[0];
      matchedCount = 2;
    } else if (finalReels[1] === finalReels[2]) {
      matchedEmoji = finalReels[1];
      matchedCount = 2;
    } else if (finalReels[0] === finalReels[2]) {
      matchedEmoji = finalReels[0];
      matchedCount = 2;
    }

    const allSame = matchedCount === 3;
    const pairHit = matchedCount === 2;
    const noMatch = matchedCount === 0;
    let winnings = 0;
    let net = -amount;
    let resultText = '';
    let color = manager.sender.colors.liveRed;
    let noMatchRefund = false;

    if (allSame || pairHit) {
      const tier = EMOJI_TO_TIER[matchedEmoji] || 'tier1';
      const mult = allSame ? TIER_MULTIPLIERS[tier] : PAIR_MULTIPLIERS[tier];
      const tierName = TIER_NAMES[tier];
      winnings = Math.floor(amount * mult);
      net = winnings - amount;
      const xpGain = allSame ? 5 : 2;

      try {
        if (winnings > 0) {
          await Economy.findOneAndUpdate(
            { userId },
            { $inc: { money: winnings, xp: xpGain } },
            { new: true }
          );
        }
      } catch (e) {
        console.error('[slots] Ödeme hatası:', e);
      }

      if (allSame) {
        color = tier === 'tier5' ? manager.sender.colors.gold : manager.sender.colors.green;
      } else {
        color = net >= 0 ? manager.sender.colors.mintGreen : manager.sender.colors.orange;
      }

      const plus = net >= 0 ? '+' : '';
      if (allSame) {
        resultText =
          `🎰 **${tierName}!** Üçü de **${matchedEmoji}${matchedEmoji}${matchedEmoji}** geldi!\n` +
          `Çarpan: **x${mult}**\n` +
          `Toplam: **${winnings.toLocaleString('tr-TR')}** coin (${plus}${net.toLocaleString('tr-TR')} NET)`;
      } else {
        resultText =
          `✨ **İkili eşleşme!** 2 tane **${matchedEmoji}** geldi.\n` +
          `Çarpan: **x${mult}** (${tierName})\n` +
          `Toplam: **${winnings.toLocaleString('tr-TR')}** coin (${plus}${net.toLocaleString('tr-TR')} NET)`;
      }
    } else if (noMatch) {
      noMatchRefund = true;
      const refund = Math.floor(amount * NO_MATCH_REFUND_RATE);
      winnings = refund;
      net = refund - amount;
      try {
        if (refund > 0) {
          await Economy.findOneAndUpdate(
            { userId },
            { $inc: { money: refund } },
            { new: true }
          );
        }
      } catch (e) {
        console.error('[slots] İade hatası:', e);
      }
      color = manager.sender.colors.orange;
      resultText =
        `😔 **Hiç eşleşmedi ama sana teselli olarak **%${Math.round(NO_MATCH_REFUND_RATE * 100)}** iade yaptık!\n` +
        `💰 İade: **${refund.toLocaleString('tr-TR')}** coin (Net: ${net.toLocaleString('tr-TR')} NET)`;
    }

    const hasWin = allSame || pairHit;
    const anyGain = hasWin && net >= 0;

    let titleText = 'KAYBETTİN';
    if (noMatchRefund) {
      titleText = '🎁 KISMİ İADE';
    } else if (anyGain) {
      titleText = allSame ? '🎉 KAZANDIN!' : '✨ KÜÇÜK KAZANÇ';
    }

    let updatedMoney;
    try {
      const latest = await Economy.findOne({ userId });
      updatedMoney = latest?.money ?? 0;
    } catch (_) {
      updatedMoney = (userData?.money ?? 0) + winnings;
    }

    const footerText = `Bakiye: ${updatedMoney.toLocaleString('tr-TR')} coin`;

    const resultEmbed = manager.sender.embed({
      color,
      title: titleText,
      description:
        `\`\`\`\n` +
        `──── SLOTS ────\n` +
        `| ${finalReels[0]} | ${finalReels[1]} | ${finalReels[2]} |\n` +
        `\`\`\`\n` +
        `**Oyuncu:** <@${userId}>, **Bahis:** \`${amount.toLocaleString('tr-TR')}\` coin\n\n` +
        `${resultText}`,
      footer: { text: footerText }
    });

    try {
      await spinMsg.edit({
        content: '',
        embeds: [resultEmbed]
      });
    } catch (_) {}
  },
};
