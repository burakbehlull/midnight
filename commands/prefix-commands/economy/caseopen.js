import Manager from '#managers';
import { Economy, UserPortfolio, MarketItem } from '#models';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

const CASE_PRICE = 250;

const RING_ITEMS = [
  { shopId: 2, name: 'Gümüş Yüzük', price: 1000,  emoji: '💍',  color: '#C0C0C0', rarity: 'Nadir' },
  { shopId: 3, name: 'Altın Yüzük',  price: 10000, emoji: '💛',  color: '#FFD700', rarity: 'Efsane' },
  { shopId: 4, name: 'Elmas Yüzük',  price: 100000,emoji: '💎',  color: '#B9F2FF', rarity: 'MİTİK' }
];

const CASE_POOL = [
  { weight: 700, type: 'coin',     value: 250,  color: '#808080', rarity: 'Başabaş',   emoji: '⚖️',  label: '250 Coin (Ücret İadesi)' },
  { weight: 140, type: 'coin',     value: 300,  color: '#86efac', rarity: 'Küçük',     emoji: '🪙',  label: '300 Coin' },
  { weight: 40,  type: 'combo_hearts', coinVal: 50, hearts: 10, color: '#fda4af', rarity: 'Kombo', emoji: '💗', label: '50 Coin + 10 Kalp' },
  { weight: 40,  type: 'combo_cookies', coinVal: 50, cookies: 10, color: '#fcd34d', rarity: 'Kombo', emoji: '🍪', label: '50 Coin + 10 Kurabiye' },
  { weight: 30,  type: 'coin',     value: 500,  color: '#4ade80', rarity: 'Orta',      emoji: '💰',  label: '500 Coin' },
  { weight: 15,  type: 'ring',     ringId: 2,   color: '#C0C0C0', rarity: 'Nadir',     emoji: '💍',  label: 'Gümüş Yüzük (1.000)' },
  { weight: 12,  type: 'coin',     value: 1000, color: '#22d3ee', rarity: 'İyi',       emoji: '💵',  label: '1.000 Coin' },
  { weight: 10,  type: 'crypto',   cryptoKind: 'any_random', color: '#a78bfa', rarity: 'Kripto', emoji: '🪙', label: '1 Adet Rastgele Kripto' },
  { weight: 5,   type: 'gold',     amount: 10,  color: '#FFD700', rarity: 'Altın',     emoji: '🟨',  label: '10 Adet Altın (GOLD)' },
  { weight: 4,   type: 'ring',     ringId: 3,   color: '#FFD700', rarity: 'Efsane',    emoji: '💛',  label: 'Altın Yüzük (10.000)' },
  { weight: 2,   type: 'coin',     value: 5000, color: '#c084fc', rarity: 'Büyük',     emoji: '🧧',  label: '5.000 Coin' },
  { weight: 1.5, type: 'coin',     value: 10000,color: '#f472b6', rarity: 'Çok Büyük', emoji: '🎁',  label: '10.000 Coin' },
  { weight: 0.4, type: 'ring',     ringId: 4,   color: '#B9F2FF', rarity: 'MİTİK',     emoji: '💎',  label: 'Elmas Yüzük (100.000)' },
  { weight: 0.1, type: 'coin',     value: 100000,color:'#ef4444', rarity: 'JACKPOT',  emoji: '🏆',  label: '100.000 Coin JACKPOT' }
];

function weightedPick(pool) {
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[0];
}

async function getOrCreateMarket() {
  let market = await MarketItem.findOne({ key: 'main' }).lean();
  if (!market) {
    const m = await MarketItem.create({ key: 'main', items: [] });
    market = m.toObject();
  }
  return market;
}

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'DOGE'];

function pickRandomCryptoSymbol() {
  return CRYPTO_SYMBOLS[Math.floor(Math.random() * CRYPTO_SYMBOLS.length)];
}

async function findCryptoItem(market, symbol) {
  return market.items.find(i => i.symbol.toUpperCase() === symbol.toUpperCase()) || null;
}

async function grantReward(userId, rewardEntry, market) {
  const applied = { label: rewardEntry.label, rarity: rewardEntry.rarity, color: rewardEntry.color, emoji: rewardEntry.emoji, summary: [] };
  const econInc = {};

  switch (rewardEntry.type) {
    case 'coin':
      econInc.money = rewardEntry.value;
      applied.summary.push(`${rewardEntry.value.toLocaleString('tr-TR')} Coin (+) `);
      break;

    case 'combo_hearts':
      econInc.money = rewardEntry.coinVal;
      econInc.hearts = rewardEntry.hearts;
      applied.summary.push(`${rewardEntry.coinVal} Coin + ${rewardEntry.hearts} Kalp`);
      break;

    case 'combo_cookies':
      econInc.money = rewardEntry.coinVal;
      econInc.cookies = rewardEntry.cookies;
      applied.summary.push(`${rewardEntry.coinVal} Coin + ${rewardEntry.cookies} Kurabiye`);
      break;

    case 'ring': {
      const ring = RING_ITEMS.find(r => r.shopId === rewardEntry.ringId);
      if (ring) {
        econInc[`inventory.${ring.shopId}`] = 1;
        applied.summary.push(`${ring.emoji} ${ring.name} envantere eklendi`);
      }
      break;
    }

    case 'gold': {
      const goldItem = await findCryptoItem(market, 'GOLD');
      const unitPrice = goldItem ? goldItem.price : 200;
      const pf = await UserPortfolio.findOne({ userId });
      if (!pf) {
        await UserPortfolio.create({
          userId,
          holdings: [{ symbol: 'GOLD', amount: rewardEntry.amount, avgBuyPrice: unitPrice }],
          transactionHistory: [{ type: 'BUY', symbol: 'GOLD', amount: rewardEntry.amount, pricePerUnit: unitPrice, total: unitPrice * rewardEntry.amount }]
        });
      } else {
        const idx = pf.holdings.findIndex(h => h.symbol.toUpperCase() === 'GOLD');
        if (idx >= 0) {
          const ex = pf.holdings[idx];
          const totalAmt = ex.amount + rewardEntry.amount;
          const newAvg = ((ex.amount * (ex.avgBuyPrice || unitPrice)) + (rewardEntry.amount * unitPrice)) / totalAmt;
          pf.holdings[idx] = { symbol: 'GOLD', amount: Math.round(totalAmt * 1e8) / 1e8, avgBuyPrice: Math.round(newAvg * 100) / 100 };
        } else {
          pf.holdings.push({ symbol: 'GOLD', amount: rewardEntry.amount, avgBuyPrice: unitPrice });
        }
        pf.transactionHistory = pf.transactionHistory || [];
        pf.transactionHistory.push({ type: 'BUY', symbol: 'GOLD', amount: rewardEntry.amount, pricePerUnit: unitPrice, total: unitPrice * rewardEntry.amount });
        await pf.save();
      }
      applied.summary.push(`🟨 ${rewardEntry.amount} adet Altın (GOLD) portföye eklendi`);
      break;
    }

    case 'crypto': {
      const symbol = pickRandomCryptoSymbol();
      const cryptoItem = await findCryptoItem(market, symbol);
      const unitPrice = cryptoItem ? cryptoItem.price : (symbol === 'BTC' ? 500 : symbol === 'ETH' ? 300 : symbol === 'SOL' ? 150 : 80);
      const cryptoName = cryptoItem ? cryptoItem.name : symbol;
      const emoji = cryptoItem ? cryptoItem.emoji : '🪙';
      const pf = await UserPortfolio.findOne({ userId });
      if (!pf) {
        await UserPortfolio.create({
          userId,
          holdings: [{ symbol, amount: 1, avgBuyPrice: unitPrice }],
          transactionHistory: [{ type: 'BUY', symbol, amount: 1, pricePerUnit: unitPrice, total: unitPrice }]
        });
      } else {
        const idx = pf.holdings.findIndex(h => h.symbol.toUpperCase() === symbol.toUpperCase());
        if (idx >= 0) {
          const ex = pf.holdings[idx];
          const totalAmt = ex.amount + 1;
          const newAvg = ((ex.amount * (ex.avgBuyPrice || unitPrice)) + unitPrice) / totalAmt;
          pf.holdings[idx] = { symbol, amount: Math.round(totalAmt * 1e8) / 1e8, avgBuyPrice: Math.round(newAvg * 100) / 100 };
        } else {
          pf.holdings.push({ symbol, amount: 1, avgBuyPrice: unitPrice });
        }
        pf.transactionHistory = pf.transactionHistory || [];
        pf.transactionHistory.push({ type: 'BUY', symbol, amount: 1, pricePerUnit: unitPrice, total: unitPrice });
        await pf.save();
      }
      applied.summary.push(`${emoji} 1 adet ${cryptoName} (${symbol}) portföye eklendi`);
      applied.label = `${emoji} 1 ${cryptoName} (${symbol})`;
      applied.emoji = emoji;
      break;
    }
  }

  if (Object.keys(econInc).length > 0) {
    await Economy.findOneAndUpdate(
      { userId },
      { $inc: econInc },
      { new: true, upsert: true, runValidators: true }
    ).catch(err => console.error('[caseopen] $inc hatası:', err));
  }

  return applied;
}

async function getCurrentMoney(userId) {
  const u = await Economy.findOne({ userId }).select('money').lean();
  return u ? (u.money || 0) : 0;
}

export default {
  name: 'kasaac',
  description: '250 coin karşılığı kasa aç, gizemli ödüller kazan!',
  aliases: ['kasaaç', 'case', 'caseopen', 'kasa'],
  usage: '.kasaac',
  category: 'economy',

  permissions: { enabled: false },

  async execute(client, message) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;
    const username = message.author.globalName || message.author.username;

    const currentMoney = await getCurrentMoney(userId);
    if (currentMoney < CASE_PRICE) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Bakiyen yetersiz.\n\nKasa Ücreti: **${CASE_PRICE.toLocaleString('tr-TR')}** Coin\nMevcut: **${currentMoney.toLocaleString('tr-TR')}** Coin`));
    }

    await Economy.findOneAndUpdate(
      { userId },
      { $inc: { money: -CASE_PRICE } },
      { new: true, upsert: true }
    );

    const market = await getOrCreateMarket();
    const rewardEntry = weightedPick(CASE_POOL);
    const applied = await grantReward(userId, rewardEntry, market);
    const updatedMoney = await getCurrentMoney(userId);

    const nonce = Date.now();

    const embed = new EmbedBuilder()
      .setColor(applied.color)
      .setTitle(`KASA— ${applied.rarity}`)
      .setDescription(`**${username}**, **${CASE_PRICE.toLocaleString('tr-TR')}**, kasa açtı!`)
      .addFields(
        { name: 'Ödülün:', value: `${applied.emoji} **${applied.label}**`, inline: false },
        { name: 'Detay:', value: applied.summary.join('\n'), inline: false },
      )
      .setTimestamp()
      .setFooter({ text: message.author.displayName || username, iconURL: message.author.avatarURL() });

    const buildButtons = (money, uid, ts) => new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`case_reopen_${uid}_${ts}`)
        .setLabel('Tekrar Aç')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(money < CASE_PRICE),
      new ButtonBuilder()
        .setCustomId(`case_exit_${uid}_${ts}`)
        .setLabel('Çık')
        .setStyle(ButtonStyle.Secondary)
    );

    const response = await message.reply({
      embeds: [embed],
      components: [buildButtons(updatedMoney, userId, nonce)]
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 60_000,
      max: 50
    });

    let lastNonce = nonce;

    collector.on('collect', async (i) => {
      try {
        await i.deferUpdate().catch(() => {});

        if (i.customId.startsWith('case_exit_')) {
          collector.stop('exit');
          return;
        }

        if (i.customId.startsWith('case_reopen_')) {
          const check = await Economy.findOneAndUpdate(
            { userId, money: { $gte: CASE_PRICE } },
            { $inc: { money: -CASE_PRICE } },
            { new: true }
          );
          if (!check) {
            await i.followUp({ content: '❌ Bakiyen yetersiz, tekrar açamazsın.', ephemeral: true }).catch(() => {});
            collector.stop('broke');
            return;
          }

          const newMarket = await getOrCreateMarket();
          const newEntry = weightedPick(CASE_POOL);
          const newApplied = await grantReward(userId, newEntry, newMarket);
          const finalMoney = await getCurrentMoney(userId);
          lastNonce = Date.now();

          const newEmbed = new EmbedBuilder()
            .setColor(newApplied.color)
            .setTitle(`KASA— ${newApplied.rarity}`)
            .setDescription(`**${username}** tekrar kasa açtı!`)
            .addFields(
              { name: 'Ödülün:', value: `${newApplied.emoji} **${newApplied.label}**`, inline: false },
              { name: 'Detay:', value: newApplied.summary.join('\n'), inline: false }
            )
            .setTimestamp()
            .setFooter({ text: message.author.displayName || username, iconURL: message.author.avatarURL() });

          await i.editReply({
            embeds: [newEmbed],
            components: [buildButtons(finalMoney, userId, lastNonce)]
          });
        }
      } catch (err) {
        console.error('[caseopen] collector hata:', err);
      }
    });

    collector.on('end', async (_c, reason) => {
      try {
        if (reason === 'exit') {
          await response.edit({ content: 'Bizi tercih ettiğin için teşekkürler. Son kasan üstte görünüyor.', components: [] }).catch(() => {});
        } else if (reason === 'time') {
          await response.edit({ content: '1 dakika geçtiği için menü kapatıldı.', components: [] }).catch(() => {});
        } else if (reason === 'broke') {
          await response.edit({ content: 'Bakiye yetersiz olduğu için menü kapatıldı. .bakiye yazarak durumunu görebilirsin.', components: [] }).catch(() => {});
        } else {
          await response.edit({ components: [] }).catch(() => {});
        }
      } catch {}
    });
  }
};
