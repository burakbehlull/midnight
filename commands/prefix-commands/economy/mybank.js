import Manager from '#managers';
import { Button, bankHelper } from '#helpers';
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonStyle
} from 'discord.js';
import { startBankCreation } from './banka.js';

const {
  getAccountsOf,
  getBank,
  getManagedBanks,
  computeBankValue,
  getBankTotals,
  fmtMoney
} = bankHelper;

const MENU_TIME = 5 * 60 * 1000;
const RATE_MIN = 0;
const RATE_MAX = 50;

const RATE_LABELS = {
  d7: '7 Gün Vadeli Faiz',
  d14: '14 Gün Vadeli Faiz',
  d21: '21 Gün Vadeli Faiz',
  d30: '30 Gün (1 Ay) Vadeli Faiz',
  loan: 'Kredi Faizi'
};

async function resolveDisplayName(client, guild, userId) {
  if (guild) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member?.displayName) return member.displayName;
  }
  const user = client.users.cache.get(userId) || (await client.users.fetch(userId).catch(() => null));
  return user ? (user.globalName ?? user.username) : userId;
}

async function loadMyData(userId) {
  const accounts = await getAccountsOf(userId);
  const list = [];
  for (const a of accounts) {
    const b = await getBank(a.bankId);
    if (b) list.push({ bank: b, account: a });
  }
  const managed = (await getManagedBanks(userId))[0] || null;
  return { list, managed };
}

function buildMainEmbed(manager, list, managed) {
  const regLines = list.length
    ? list
        .map(({ bank, account }) => {
          const termTotal = (account.deposits || []).reduce((s, d) => s + (d.amount || 0), 0);
          const termStr = termTotal > 0 ? ` · vadeli \`${fmtMoney(termTotal)} coin\`` : '';
          return `${bank.emoji} **${bank.name}** — vadesiz \`${fmtMoney(account.balance)} coin\`${termStr}`;
        })
        .join('\n')
    : '> Hiçbir bankaya kayıtlı değilsiniz. `.banka` ile hesap açın.';

  const fields = [
    { name: '📌 Kayıtlı Olduğum Bankalar', value: regLines, inline: false },
    {
      name: '👑 Yönettiğim Banka',
      value: managed ? `${managed.emoji} **${managed.name}**` : '> Yönettiğiniz bir banka yok.',
      inline: false
    }
  ];

  return manager.sender.embed({
    color: manager.sender.colors.gold,
    title: '🏦 Bankalarım',
    description:
      'Hesaplarınızı ve (varsa) yönettiğiniz bankayı buradan görebilirsiniz.\n' +
      (managed
        ? 'Bankanızı yönetmek için aşağıdaki butonu kullanın.'
        : 'Kendi bankanızı kurmak için **Banka Kur** butonunu kullanın.'),
    fields,
    footer: { text: managed ? 'CEO ve ortaklar bankayı yönetebilir.' : `Sermaye: ${fmtMoney(1000000)} coin` }
  });
}

function buildMainRows(managed) {
  const rows = [];
  const b = new Button();
  if (managed) {
    b.add('bm_manage', `Bankamı Yönet · ${managed.name}`.slice(0, 80), ButtonStyle.Primary, '⚙️');
  } else {
    b.add('bm_create', 'Banka Kur', ButtonStyle.Success, '🏗️');
  }
  rows.push(b.build());
  return rows;
}

async function buildManageEmbed(manager, bank) {
  const value = await computeBankValue(bank);
  const totals = await getBankTotals(bank.bankId);
  const r = bank.rates || {};
  const top = [...totals.accounts].sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 3);
  const topLines = top.length
    ? top.map((a) => `\`${a.userId}\` — \`${fmtMoney(a.balance)} coin\``).join('\n')
    : '> Henüz hesap yok.';

  return manager.sender.embed({
    color: manager.sender.colors.darkBlue,
    title: `⚙️ ${bank.name} · Yönetim Paneli`,
    description: 'Bankanızın durumunu izleyin ve faiz oranlarını yönetin.',
    fields: [
      {
        name: '💰 Banka Durumu',
        value:
          `Sermaye: \`${fmtMoney(value.capital)} coin\`\n` +
          `Rezerv (kasa): \`${fmtMoney(value.reserve)} coin\`\n` +
          `**Banka Değeri:** \`${fmtMoney(value.value)} coin\``,
        inline: false
      },
      {
        name: '📥 Mevduat & Krediler',
        value:
          `Hesap sayısı: **${totals.accountCount}**\n` +
          `Vadesiz toplam: \`${fmtMoney(totals.depositTotal)} coin\`\n` +
          `Vadeli toplam: \`${fmtMoney(totals.termTotal)} coin\`\n` +
          `Verilen krediler: \`${fmtMoney(totals.loanTotal)} coin\` (${totals.loanCount} aktif)`,
        inline: false
      },
      {
        name: '📈 Faiz Oranları (%/gün)',
        value:
          `Vadesiz: faizsiz\n` +
          `7g **%${r.d7}** · 14g **%${r.d14}** · 21g **%${r.d21}**\n` +
          `30g **%${r.d30}** · Kredi **%${r.loan}** (gecikme ×${r.overdueMultiplier})`,
        inline: false
      },
      { name: '👥 En Yüksek Bakiyeler', value: topLines, inline: false }
    ],
    footer: { text: 'Faiz oranlarını sadece CEO ve ortaklar değiştirebilir.' }
  });
}

function buildManageRows() {
  const r1 = new Button();
  r1.add('bm_rates', 'Faiz Ayarları', ButtonStyle.Primary, '⚙️');
  r1.add('bm_accounts', 'Hesaplar', ButtonStyle.Secondary, '📊');
  r1.add('bm_refresh', 'Yenile', ButtonStyle.Secondary, '🔄');
  r1.add('bm_main', 'Geri', ButtonStyle.Danger, '🔙');
  return [r1.build()];
}

function buildRateEmbed(manager, bank, rateKey) {
  const r = bank.rates || {};
  const fields = Object.keys(RATE_LABELS).map((key) => ({
    name: `${key === rateKey ? '👉 ' : ''}${RATE_LABELS[key]}`,
    value: `**%${r[key]}** /gün`,
    inline: true
  }));
  return manager.sender.embed({
    color: manager.sender.colors.orange,
    title: `⚙️ Faiz Ayarları · ${bank.name}`,
    description:
      'Menüden bir oran seçin, ardından **−/+ 0.1** veya **−/+ 0.5** butonlarıyla ayarlayın.\n' +
      `Seçili oran: **${RATE_LABELS[rateKey]}**`,
    fields,
    footer: { text: `Sınır: %${RATE_MIN} – %${RATE_MAX}/gün` }
  });
}

function buildRateRows(rateKey) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('bm_rate_select')
    .setPlaceholder('Ayarlanacak faiz oranını seçin...')
    .addOptions(
      Object.keys(RATE_LABELS).map((key) => ({
        label: RATE_LABELS[key],
        value: key,
        default: key === rateKey
      }))
    );
  const r1 = new Button();
  r1.add('bm_rate_dn5', '− 0.5', ButtonStyle.Danger, null);
  r1.add('bm_rate_dn1', '− 0.1', ButtonStyle.Danger, null);
  r1.add('bm_rate_up1', '+ 0.1', ButtonStyle.Success, null);
  r1.add('bm_rate_up5', '+ 0.5', ButtonStyle.Success, null);
  const r2 = new Button();
  r2.add('bm_rate_back', 'Bankaya Dön', ButtonStyle.Secondary, '🔙');
  return [new ActionRowBuilder().addComponents(select), r1.build(), r2.build()];
}

async function buildAccountsEmbed(manager, bank, client, guild) {
  const totals = await getBankTotals(bank.bankId);
  const sorted = [...totals.accounts].sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 15);
  const lines = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const name = await resolveDisplayName(client, guild, a.userId);
    const termTotal = (a.deposits || []).reduce((s, d) => s + (d.amount || 0), 0);
    lines.push(
      `**${i + 1}.** ${name} — vadesiz \`${fmtMoney(a.balance)} coin\`` +
        (termTotal > 0 ? ` · vadeli \`${fmtMoney(termTotal)} coin\`` : '')
    );
  }
  return manager.sender.embed({
    color: manager.sender.colors.blueGray,
    title: `📊 Hesaplar · ${bank.name}`,
    description: 'Bankadaki hesaplar bakiye sırasına göre (ilk 15).',
    fields: [
      {
        name: `👥 Hesap Sahipleri (${totals.accountCount})`,
        value: lines.length ? lines.join('\n') : '> Henüz hesap açılmamış.',
        inline: false
      }
    ],
    footer: { text: `Vadesiz toplam: ${fmtMoney(totals.depositTotal)} · Vadeli toplam: ${fmtMoney(totals.termTotal)}` }
  });
}

function buildAccountsRows() {
  const b = new Button();
  b.add('bm_manage_back', 'Bankaya Dön', ButtonStyle.Secondary, '🔙');
  return [b.build()];
}

export default {
  name: 'mybank',
  category: 'economy',
  aliases: ['bankam'],
  usage: '.mybank',
  description: 'Kayıtlı bankalarınızı ve yönettiğiniz bankayı gösterir.',
  permissions: {
    enabled: false
  },
  async execute(client, message) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;

    let data = await loadMyData(userId);
    let managed = data.managed;
    let rateKey = 'd7';

    let rootMsg;
    try {
      rootMsg = await message.channel.send({
        embeds: [buildMainEmbed(manager, data.list, managed)],
        components: buildMainRows(managed)
      });
    } catch (e) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Panel açılamadı.'));
    }

    const btnCollector = rootMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: MENU_TIME,
      filter: (i) => i.message.id === rootMsg.id
    });
    const selCollector = rootMsg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: MENU_TIME,
      filter: (i) => i.message.id === rootMsg.id
    });

    const reload = async () => {
      data = await loadMyData(userId);
      managed = data.managed;
    };

    const showMain = async (i) => {
      await reload();
      const payload = { embeds: [buildMainEmbed(manager, data.list, managed)], components: buildMainRows(managed) };
      if (i) return i.update(payload).catch(() => {});
      return rootMsg.edit(payload).catch(() => {});
    };

    const showManage = async (i) => {
      await reload();
      if (!managed) {
        return i.reply({ content: '❌ Yönettiğiniz bir banka yok.', ephemeral: true }).catch(() => {});
      }
      const payload = { embeds: [await buildManageEmbed(manager, managed)], components: buildManageRows() };
      if (i) return i.update(payload).catch(() => {});
      return rootMsg.edit(payload).catch(() => {});
    };

    const showRates = async (i) => {
      await reload();
      if (!managed) return;
      const payload = { embeds: [buildRateEmbed(manager, managed, rateKey)], components: buildRateRows(rateKey) };
      if (i) return i.update(payload).catch(() => {});
      return rootMsg.edit(payload).catch(() => {});
    };

    const showAccounts = async (i) => {
      await reload();
      if (!managed) return;
      const payload = {
        embeds: [await buildAccountsEmbed(manager, managed, client, message.guild)],
        components: buildAccountsRows()
      };
      if (i) return i.update(payload).catch(() => {});
      return rootMsg.edit(payload).catch(() => {});
    };

    btnCollector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        await i.reply({ content: '❌ Bu panel size ait değil.', ephemeral: true }).catch(() => {});
        return;
      }
      const id = i.customId;

      if (id === 'bm_create') {
        btnCollector.stop('create');
        selCollector.stop('create');
        await rootMsg.edit({ components: [] }).catch(() => {});
        return startBankCreation(client, message, manager);
      }

      if (id === 'bm_manage') return showManage(i);
      if (id === 'bm_main') return showMain(i);
      if (id === 'bm_refresh') return showManage(i);
      if (id === 'bm_accounts') return showAccounts(i);
      if (id === 'bm_rates') return showRates(i);
      if (id === 'bm_manage_back') return showManage(i);
      if (id === 'bm_rate_back') return showManage(i);

      if (id.startsWith('bm_rate_')) {
        if (!managed) return i.deferUpdate().catch(() => {});
        const deltas = { bm_rate_dn5: -0.5, bm_rate_dn1: -0.1, bm_rate_up1: 0.1, bm_rate_up5: 0.5 };
        const delta = deltas[id];
        if (delta === undefined) return i.deferUpdate().catch(() => {});
        const current = managed.rates?.[rateKey] ?? 0;
        const next = Math.min(RATE_MAX, Math.max(RATE_MIN, Math.round((current + delta) * 10) / 10));
        managed.rates[rateKey] = next;
        managed.markModified('rates');
        await managed.save().catch(() => {});
        return i.update({
          embeds: [buildRateEmbed(manager, managed, rateKey)],
          components: buildRateRows(rateKey)
        }).catch(() => {});
      }
    });

    selCollector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        await i.reply({ content: '❌ Bu panel size ait değil.', ephemeral: true }).catch(() => {});
        return;
      }
      if (i.customId !== 'bm_rate_select') return;
      rateKey = i.values[0];
      if (!managed) return i.deferUpdate().catch(() => {});
      return i.update({
        embeds: [buildRateEmbed(manager, managed, rateKey)],
        components: buildRateRows(rateKey)
      }).catch(() => {});
    });

    btnCollector.on('end', () => {
      selCollector.stop('end');
      rootMsg.edit({ components: [] }).catch(() => {});
    });
  }
};
