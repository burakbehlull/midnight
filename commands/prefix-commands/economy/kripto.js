import Manager from '#managers';
import { Economy } from '#models';
import { Button, Modal, marketHelper } from '#helpers';

const {
  getOrCreateMarket,
  getOrCreatePortfolio,
  calcChangePercent,
  findItemBySymbol,
  getItemsByCategory,
  computePortfolioValue,
  performBuy,
  performSell,
  getHolding
} = marketHelper

import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonStyle,
  userMention
} from 'discord.js';

const CATEGORY_NAMES = {
  crypto: { title: 'Kripto Paralar', icon: '🌐' },
  metal: { title: 'Değerli Madenler', icon: '🏅' },
  custom: { title: 'Özel Coinler', icon: '🎴' }
};

const MENU_ACTIVE_TIME = 5 * 60 * 1000;
const MOVE_TIMEOUT = 2 * 60 * 1000;

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0.00';
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(pct) {
  const s = pct.toFixed(2);
  return pct > 0 ? `+${s}` : s;
}

function fmtQty(n) {
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(Number(n) * 10000) / 10000;
  const str = rounded.toString();
  if (!str.includes('.')) return str;
  return str.replace(/0+$/, '').replace(/\.$/, '');
}

function buildPriceRows(items) {
  const lines = [];
  for (const it of items) {
    const change = calcChangePercent(it.price, it.previousPrice);
    const prefix = change > 0 ? '+' : change < 0 ? '-' : '−';
    const arrow = change > 0 ? '📈' : change < 0 ? '📉' : '➖';
    lines.push(
      `${arrow} ${it.emoji} **${it.symbol}**  \`${fmt(it.price)} coin\`  **${change >= 0 ? '+' : ''}${formatPct(change)}%**`
    );
  }
  return lines.join('\n');
}

function buildHomeEmbed(client, manager, message, authorEconomy, market) {
  const fields = [];
  const groups = getItemsByCategory(market.items);
  for (const cat of Object.keys(CATEGORY_NAMES)) {
    const arr = groups[cat] || [];
    if (arr.length === 0) continue;
    fields.push({
      name: `${CATEGORY_NAMES[cat].icon} ${CATEGORY_NAMES[cat].title}`,
      value: buildPriceRows(arr),
      inline: false
    });
  }
  return manager.sender.embed({
    color: manager.sender.colors.purple,
    title: '💹 Kripto Para Piyasası',
    description:
      `Kripto para alım-satım yapın ve portföyünüzü yönetin!\n\n` +
      `**Bakiyeniz:** \`${fmt(authorEconomy?.money ?? 0)} coin\``,
    fields,
    footer: { text: `Fiyatlar her 10 dakikada bir güncellenir | Menü 5 dakika aktif | ${market.items.length} varlık` }
  });
}

function buildHomeButtons(disabled = false) {
  const btns1 = new Button();
  btns1.add('mk_detailed', 'Detaylı Piyasa', ButtonStyle.Primary, '🔍', disabled);
  btns1.add('mk_buy', 'Satın Al', ButtonStyle.Success, '💵', disabled);
  btns1.add('mk_sell', 'Sat', ButtonStyle.Danger, '💸', disabled);
  const btns2 = new Button();
  btns2.add('mk_portfolio', 'Portföyüm', ButtonStyle.Secondary, '📊', disabled);
  btns2.add('mk_history', 'İşlem Geçmişi', ButtonStyle.Secondary, '📜', disabled);
  return [btns1.build(), btns2.build()];
}

function buildDetailedEmbed(manager, market) {
  const fields = [];
  for (const it of market.items) {
    const change = calcChangePercent(it.price, it.previousPrice);
    const pctStr = `${change >= 0 ? '+' : ''}${formatPct(change)}%`;
    fields.push({
      name: `${it.emoji} ${it.symbol} — ${it.name}`,
      value:
        `Fiyat: \`${fmt(it.price)} coin\` | Değişim: \`${pctStr}\`\n` +
        `Risk: **${it.riskLabel}** (${it.riskLevel}/5) | Kategori: **${CATEGORY_NAMES[it.category].icon} ${CATEGORY_NAMES[it.category].title.replace(/^[^\s]+\s+/, '')}**\n` +
        `Taban: \`${fmt(it.minPrice)}\` | Tav.ATH: \`${fmt(it.allTimeHigh)}\` | Düşük ATL: \`${fmt(it.allTimeLow)}\``,
      inline: false
    });
  }
  return manager.sender.embed({
    color: manager.sender.colors.gold,
    title: '🔍 Detaylı Piyasa — Tüm Varlıklar',
    description: `Toplam **${market.items.length}** varlık listeleniyor.`,
    fields,
    footer: { text: 'Menüye dönmek için geri butonunu kullanın.' }
  });
}

function buildBackRow(disabled = false) {
  const b = new Button();
  b.add('mk_back', '↩️ Ana Piyasa', ButtonStyle.Primary, '🏠', disabled);
  return [b.build()];
}

function buildCoinSelect(items, customIdPrefix, placeHolder, withAmountHint = true) {
  const options = items.map(it => {
    const risk = `Risk: ${it.riskLabel} ${'⭐'.repeat(it.riskLevel)}`;
    return {
      label: `${it.symbol} - ${fmt(it.price)} coin`,
      description: risk,
      value: it.symbol,
      emoji: it.emoji?.match(/\p{Extended_Pictographic}/u) ? it.emoji : undefined
    };
  });
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${customIdPrefix}_coinselect`)
    .setPlaceholder(placeHolder)
    .addOptions(options);
  return [new ActionRowBuilder().addComponents(menu)];
}

function buildBuyEmbed(manager, authorEconomy, market) {
  const groups = getItemsByCategory(market.items);
  const fields = [];
  for (const cat of Object.keys(CATEGORY_NAMES)) {
    const arr = groups[cat] || [];
    if (arr.length === 0) continue;
    const rows = arr.map(it =>
      `  ${it.emoji} **${it.symbol}**: \`${fmt(it.price)} coin\` | ${it.riskLabel}`
    );
    fields.push({
      name: `${CATEGORY_NAMES[cat].icon} ${CATEGORY_NAMES[cat].title}`,
      value: rows.join('\n'),
      inline: false
    });
  }
  return manager.sender.embed({
    color: manager.sender.colors.green,
    title: 'Kripto Satın Al',
    description:
      `Satın almak istediğiniz kripto parayı aşağıdaki menüden seçin, ardından miktarı girin.\n\n` +
      `**Bakiyeniz:** \`${fmt(authorEconomy?.money ?? 0)} coin\``,
    fields,
    footer: { text: 'Aşamalı olarak: Coin seç → Miktar gir → Onayla' }
  });
}

function buildSellEmbed(manager, market, portfolio) {
  const holdings = portfolio?.holdings || [];
  const groups = getItemsByCategory(market.items);
  const fields = [];
  for (const cat of Object.keys(CATEGORY_NAMES)) {
    const arr = groups[cat] || [];
    if (arr.length === 0) continue;
    const rows = arr.map(it => {
      const h = getHolding(portfolio, it.symbol);
      const amt = h ? h.amount : 0;
      return `  ${it.emoji} **${it.symbol}**: \`${fmt(it.price)} coin\` | Elinizde: **${fmtQty(amt)}**`;
    });
    fields.push({
      name: `${CATEGORY_NAMES[cat].icon} ${CATEGORY_NAMES[cat].title}`,
      value: rows.join('\n'),
      inline: false
    });
  }
  return manager.sender.embed({
    color: manager.sender.colors.liveRed,
    title: 'Kripto Sat',
    description:
      `Satmak istediğiniz kripto parayı seçin, ardından miktarı girin.\n\n` +
      `**Bakiyeniz:** \`${fmt(0)}\` (alt kısımda güncellenecektir)`,
    fields,
    footer: { text: 'Elinde olmayan coinleri satamazsın.' }
  });
}

function buildPortfolioEmbed(manager, market, portfolio, targetUserInfo, econBalance) {
  const fields = [];
  const holdings = (portfolio?.holdings || []).filter(h => (h.amount || 0) > 0);
  const { total, costBasis } = computePortfolioValue(portfolio, market.items);
  const netPL = total - costBasis;
  const netPLPct = costBasis > 0 ? (netPL / costBasis) * 100 : 0;

  const lines = [];
  if (holdings.length === 0) {
    lines.push('> Henüz hiçbir varlığınız yok.');
  } else {
    for (const h of holdings) {
      const item = findItemBySymbol(market.items, h.symbol);
      if (!item) continue;
      const currentValue = h.amount * item.price;
      const pl = currentValue - (h.amount * (h.avgBuyPrice || item.price));
      const plPct = h.avgBuyPrice > 0 ? ((item.price - h.avgBuyPrice) / h.avgBuyPrice) * 100 : 0;
      lines.push(
        `${item.emoji} **${h.symbol}** — ${fmtQty(h.amount)} adet\n` +
        `  Ort. Alış: \`${fmt(h.avgBuyPrice || item.price)} coin\` | Şimdiki: \`${fmt(item.price)} coin\` | ${plPct >= 0 ? '+' : ''}${formatPct(plPct)}%\n` +
        `  Değer: \`${fmt(currentValue)} coin\` ${pl >= 0 ? '📈' : '📉'} **${pl >= 0 ? '+' : ''}${fmt(pl)}**`
      );
    }
  }

  fields.push({
    name: targetUserInfo.isSelf ? '💼 Senin Portföyün' : `💼 ${targetUserInfo.displayName} Portföyü`,
    value: lines.join('\n') || '> Boş.',
    inline: false
  });

  const overallColor = netPL >= 0 ? manager.sender.colors.green : manager.sender.colors.liveRed;
  const overallTitle = netPL >= 0 ? '📈 Genel Kar' : '📉 Genel Zarar';
  fields.push({
    name: overallTitle,
    value:
      `Toplam Yatırım (Maliyet): \`${fmt(costBasis)} coin\`\n` +
      `Güncel Değer: \`${fmt(total)} coin\`\n` +
      `Net: **${netPL >= 0 ? '+' : ''}${fmt(netPL)} coin** (\`${netPLPct >= 0 ? '+' : ''}${formatPct(netPLPct)}%\`)\n` +
      `Nakit Bakiyesi: \`${fmt(econBalance ?? 0)} coin\``,
    inline: false
  });

  return manager.sender.embed({
    color: overallColor,
    title: targetUserInfo.isSelf ? '📊 Portföy Yönetimi' : `📊 ${targetUserInfo.displayName} Portföyü`,
    description: targetUserInfo.isSelf
      ? `Portföy özetin ve varlıkların detayı.`
      : `${userMention(targetUserInfo.id)} kullanıcısının portföyü.`,
    fields,
    footer: { text: targetUserInfo.isSelf ? 'Ana ekrana dönmek için geri butonuna tıklayın.' : 'Salt görüntüleme modu' }
  });
}

function buildHistoryEmbed(manager, portfolio) {
  const history = (portfolio?.transactionHistory || []).slice().reverse().slice(0, 15);
  const fields = [];
  if (history.length === 0) {
    fields.push({ name: '📜 İşlem Bulunamadı', value: '> Henüz alım veya satım yapmadın.', inline: false });
  } else {
    const lines = [];
    for (let i = 0; i < history.length; i++) {
      const tx = history[i];
      const time = tx.time ? new Date(tx.time).toLocaleString('tr-TR') : '—';
      const sign = tx.type === 'BUY' ? '📥' : '📤';
      const type = tx.type === 'BUY' ? 'ALIM' : 'SATIM';
      lines.push(
        `**${i + 1}.** ${sign} **${type}** ${tx.symbol} × ${fmtQty(tx.amount)}\n` +
        `   Birim: \`${fmt(tx.pricePerUnit)}\` | Toplam: \`${fmt(tx.total)} coin\`\n` +
        `   ⏰ ${time}`
      );
    }
    fields.push({
      name: 'Son İşlemler (en yeni)',
      value: lines.join('\n'),
      inline: false
    });
  }
  return manager.sender.embed({
    color: manager.sender.colors.blurple,
    title: 'İşlem Geçmişi',
    description: `Son 15 alım/satım işlemi listeleniyor.`,
    fields,
    footer: { text: 'Ana ekrana dönmek için geri butonuna tıklayın.' }
  });
}

async function resolveTargetUser(client, message, args) {
  if (message.mentions && message.mentions.users && message.mentions.users.size > 0) {
    const target = message.mentions.users.first();
    let displayName = target.globalName ?? target.username;
    if (message.guild) {
      try {
        const member = await message.guild.members.fetch(target.id).catch(() => null);
        if (member?.displayName) displayName = member.displayName;
      } catch (_) {}
    }
    return {
      id: target.id,
      user: target,
      displayName,
      isSelf: target.id === message.author.id
    };
  }
  if (args && args.length > 0 && /^\d{16,}$/.test(args[0])) {
    const targetId = args[0];
    const cached = client.users.cache.get(targetId);
    if (cached) {
      return {
        id: targetId,
        user: cached,
        displayName: cached.globalName ?? cached.username,
        isSelf: targetId === message.author.id
      };
    }
    const fetched = await client.users.fetch(targetId).catch(() => null);
    if (fetched) {
      return {
        id: targetId,
        user: fetched,
        displayName: fetched.globalName ?? fetched.username,
        isSelf: targetId === message.author.id
      };
    }
  }
  const self = message.author;
  let displayName = self.globalName ?? self.username;
  if (message.guild) {
    try {
      const member = await message.guild.members.fetch(self.id).catch(() => null);
      if (member?.displayName) displayName = member.displayName;
    } catch (_) {}
  }
  return { id: self.id, user: self, displayName, isSelf: true };
}

async function runAmountModal(interaction, action, symbol, item) {
  const modal = new Modal(`mk_modal_${action}_${symbol}_${Date.now()}`,
    `${action === 'BUY' ? '💵' : '💸'} ${symbol} ${action === 'BUY' ? 'Alımı' : 'Satışı'} - Miktar`);
  modal.add(
    `mk_amount_${action}_${symbol}`,
    `Miktar (${action === 'BUY' ? 'Satın alınacak' : 'Satılacak'} ${symbol})`,
    {
      required: true,
      placeholder: `Örn: 1  veya  0.5  (Birim fiyat: ${fmt(item.price)} coin)`,
      paragraph: false,
      max: 40,
      min: 1
    }
  );
  await interaction.showModal(modal.build());
  try {
    const submitted = await interaction.awaitModalSubmit({
      filter: (m) =>
        m.user.id === interaction.user.id &&
        m.customId.startsWith(`mk_modal_${action}_${symbol}_`),
      time: MOVE_TIMEOUT
    });
    const valueRaw = submitted.fields.getTextInputValue(`mk_amount_${action}_${symbol}`);
    const value = Number(String(valueRaw || '').replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      await submitted.reply({ content: '❌ Geçersiz miktar girdiniz.', ephemeral: true }).catch(() => {});
      return null;
    }
    return { submit: submitted, value };
  } catch (_) {
    return null;
  }
}

export default {
  name: 'kripto',
  category: 'economy',
  aliases: ['cripto', 'cripto', 'piyasa', 'borsa', 'market'],
  usage: '.kripto [@user]',
  description: 'Kripto borsası: fiyatlar, al-sat, portföy.',
  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const authorId = message.author.id;

    const target = await resolveTargetUser(client, message, args);

    let market;
    try {
      market = await getOrCreateMarket();
    } catch (e) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Piyasa verileri alınamadı.'));
    }

    let authorEconomy = await Economy.findOne({ userId: authorId }).lean();
    if (!authorEconomy) {
      authorEconomy = await Economy.create({ userId: authorId, money: 0 });
      authorEconomy = authorEconomy.toObject();
    }

    let authorPortfolio = await getOrCreatePortfolio(authorId);
    const isViewingOther = !target.isSelf;

    const startEmbed = isViewingOther
      ? buildPortfolioEmbed(
          manager,
          market,
          await getOrCreatePortfolio(target.id).catch(() => null),
          target,
          (await Economy.findOne({ userId: target.id }).lean()?.money) ?? 0
        )
      : buildHomeEmbed(client, manager, message, authorEconomy, market);
    const startComponents = isViewingOther ? [] : buildHomeButtons(false);

    let rootMsg;
    try {
      rootMsg = await message.channel.send({
        embeds: [startEmbed],
        components: startComponents
      });
    } catch (e) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Mesaj gönderilemedi.'));
    }

    if (isViewingOther) return;

    let currentView = 'HOME';
    let currentBuySymbol = null;
    let currentSellSymbol = null;

    const collector = rootMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: MENU_ACTIVE_TIME,
      filter: (i) => i.message.id === rootMsg.id
    });

    const selectCollector = rootMsg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: MENU_ACTIVE_TIME,
      filter: (i) => i.message.id === rootMsg.id
    });

    const disableAll = () => {
      collector.stop('disabled');
      selectCollector.stop('disabled');
      try {
        const rows = [];
        if (currentView === 'HOME') {
          const [r1, r2] = buildHomeButtons(true);
          rows.push(r1, r2);
        } else {
          rows.push(...buildBackRow(true));
        }
        rootMsg.edit({ components: rows }).catch(() => {});
      } catch (_) {}
    };

    const refreshEconomy = async () => {
      const eco = await Economy.findOne({ userId: authorId }).lean();
      if (eco) authorEconomy = eco;
    };

    const refreshPortfolio = async () => {
      authorPortfolio = await getOrCreatePortfolio(authorId);
    };

    const goHome = async (i) => {
      currentView = 'HOME';
      await refreshEconomy();
      try {
        await i.update({
          embeds: [buildHomeEmbed(client, manager, message, authorEconomy, market)],
          components: buildHomeButtons(false)
        });
      } catch (e) {}
    };

    collector.on('collect', async (i) => {
      if (i.user.id !== authorId) {
        await i.reply({ content: '❌ Bu menü size ait değil.', ephemeral: true }).catch(() => {});
        return;
      }
      const id = i.customId;

      if (id === 'mk_detailed') {
        currentView = 'DETAILED';
        try {
          await i.update({
            embeds: [buildDetailedEmbed(manager, market)],
            components: buildBackRow(false)
          });
        } catch (_) {}
        return;
      }

      if (id === 'mk_back') {
        await goHome(i);
        return;
      }

      if (id === 'mk_portfolio') {
        currentView = 'PORTFOLIO';
        try {
          await refreshEconomy();
          await refreshPortfolio();
          await i.update({
            embeds: [buildPortfolioEmbed(
              manager,
              market,
              authorPortfolio,
              { isSelf: true, id: authorId, displayName: message.author.globalName ?? message.author.username },
              authorEconomy?.money ?? 0
            )],
            components: buildBackRow(false)
          });
        } catch (_) {}
        return;
      }

      if (id === 'mk_history') {
        currentView = 'HISTORY';
        try {
          await refreshPortfolio();
          await i.update({
            embeds: [buildHistoryEmbed(manager, authorPortfolio)],
            components: buildBackRow(false)
          });
        } catch (_) {}
        return;
      }

      if (id === 'mk_buy') {
        currentView = 'BUY_SELECT';
        try {
          await refreshEconomy();
          await i.update({
            embeds: [buildBuyEmbed(manager, authorEconomy, market)],
            components: [
              ...buildCoinSelect(market.items, 'mkbuy', 'Satın almak istediğiniz coini seçin...'),
              ...buildBackRow(false)
            ]
          });
        } catch (_) {}
        return;
      }

      if (id === 'mk_sell') {
        currentView = 'SELL_SELECT';
        try {
          await refreshPortfolio();
          await i.update({
            embeds: [buildSellEmbed(manager, market, authorPortfolio)],
            components: [
              ...buildCoinSelect(market.items, 'mksell', 'Satmak istediğiniz coini seçin...'),
              ...buildBackRow(false)
            ]
          });
        } catch (_) {}
        return;
      }
    });

    selectCollector.on('collect', async (i) => {
      if (i.user.id !== authorId) {
        await i.reply({ content: '❌ Bu menü size ait değil.', ephemeral: true }).catch(() => {});
        return;
      }
      const isBuy = i.customId.startsWith('mkbuy_');
      const isSell = i.customId.startsWith('mksell_');
      if (!isBuy && !isSell) return;

      const symbol = Array.isArray(i.values) ? i.values[0] : null;
      if (!symbol) return;
      const item = findItemBySymbol(market.items, symbol);
      if (!item) {
        await i.reply({ content: '❌ Varlık bulunamadı.', ephemeral: true }).catch(() => {});
        return;
      }

      if (isBuy) {
        currentBuySymbol = symbol;
      } else {
        const h = getHolding(authorPortfolio, symbol);
        if (!h || h.amount <= 0) {
          await i.reply({ content: `❌ ${symbol} coinden elinizde yok.`, ephemeral: true }).catch(() => {});
          return;
        }
        currentSellSymbol = symbol;
      }

      const res = await runAmountModal(i, isBuy ? 'BUY' : 'SELL', symbol, item);
      if (!res) {
        try { await i.deferUpdate().catch(() => {}); } catch (_) {}
        return;
      }
      const { submit, value } = res;

      if (isBuy) {
        const marketNow = await getOrCreateMarket();
        const result = await performBuy(authorId, symbol, value, marketNow.items);
        await refreshEconomy();
        await refreshPortfolio();
        if (!result.ok) {
          await submit.reply({
            content: `❌ Alım başarısız: ${result.error}`,
            ephemeral: true
          }).catch(() => {});
          return;
        }
        await submit.reply({
          content: `${result.emoji} **${result.symbol}** × ${fmtQty(result.amount)} adet\n` +
            `Birim: ${fmt(result.unitPrice)} coin  |  Toplam: \`${fmt(result.total)} coin\`\n` +
            `Yeni bakiye: \`${fmt(authorEconomy?.money ?? 0)} coin\``,
          ephemeral: false
        }).catch(() => {});
        try {
          const buyEmbed = buildBuyEmbed(manager, authorEconomy, marketNow);
          await rootMsg.edit({
            embeds: [buyEmbed],
            components: [
              ...buildCoinSelect(marketNow.items, 'mkbuy', 'Devam etmek için coin seçin...'),
              ...buildBackRow(false)
            ]
          });
        } catch (_) {}
      } else {
        const marketNow = await getOrCreateMarket();
        const result = await performSell(authorId, symbol, value, marketNow.items);
        await refreshEconomy();
        await refreshPortfolio();
        if (!result.ok) {
          await submit.reply({
            content: `❌ Satım başarısız: ${result.error}`,
            ephemeral: true
          }).catch(() => {});
          return;
        }
        await submit.reply({
          content: `**SATILDI!** ${result.emoji} **${result.symbol}** × ${fmtQty(result.amount)} adet\n` +
            `Birim: ${fmt(result.unitPrice)} coin  |  Gelen: \`${fmt(result.total)} coin\`\n` +
            `Yeni bakiye: \`${fmt(authorEconomy?.money ?? 0)} coin\``,
          ephemeral: false
        }).catch(() => {});
        try {
          const sellEmbed = buildSellEmbed(manager, marketNow, authorPortfolio);
          await rootMsg.edit({
            embeds: [sellEmbed],
            components: [
              ...buildCoinSelect(marketNow.items, 'mksell', 'Devam etmek için coin seçin...'),
              ...buildBackRow(false)
            ]
          });
        } catch (_) {}
      }
    });

    collector.on('end', () => disableAll());
  }
};
