import Manager from '#managers';
import { Economy, Bank, BankLoan } from '#models';
import { Button, Modal, bankHelper } from '#helpers';
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ComponentType,
  ButtonStyle
} from 'discord.js';

const {
  BANK_CAPITAL,
  TERM_DAYS,
  TERM_RATE_KEY,
  LOAN_DAYS,
  HISTORY_LABELS,
  listActiveBanks,
  getBank,
  getOrCreateAccount,
  getAccountsOf,
  pushHistory,
  calcTermPayout,
  getManagedBanks,
  hasManagedBank,
  fmtMoney,
  computeBankValue,
  getUserLoans,
  newLoanId,
  newDepositId
} = bankHelper;

const MENU_TIME = 5 * 60 * 1000;
const MODAL_TIME = 120 * 1000;
const MS_PER_DAY = 86400000;

/* ============================== UTILS ============================== */

function toEmojiObj(input) {
  if (!input) return undefined;
  if (/\p{Extended_Pictographic}/u.test(input)) return input;
  const m = input.match(/<a?:(\w+):(\d+)>/);
  if (m) return { id: m[2], name: m[1], animated: input.startsWith('<a:') };
  return undefined;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function fmtDate(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

function fmtRemain(ms) {
  if (ms <= 0) return 'tamamlandı';
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}g ${h}s`;
  if (h > 0) return `${h}s ${m}dk`;
  return `${Math.max(1, m)}dk`;
}

function dayLabel(days) {
  return days === 30 ? '1 Ay (30 Gün)' : `${days} Gün`;
}

function parseAmountInput(raw) {
  const cleaned = String(raw || '').replace(/[^\d]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function makeBankId(name) {
  const map = {
    ı: 'i', İ: 'i', I: 'i', i: 'i',
    ş: 's', Ş: 's', ğ: 'g', Ğ: 'g',
    ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c'
  };
  const slug = String(name || '')
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return `bank_${slug || 'banka'}_${Date.now().toString(36)}`;
}

async function resolveDisplayName(client, guild, userId) {
  if (guild) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member?.displayName) return member.displayName;
  }
  const user = client.users.cache.get(userId) || (await client.users.fetch(userId).catch(() => null));
  return user ? (user.globalName ?? user.username) : userId;
}

async function runAmountModal(interaction, key, title, label, placeholder) {
  const modalId = `${key}_modal_${Date.now()}`;
  const inputId = `${key}_input`;
  const modal = new Modal(modalId, title);
  modal.add(inputId, label, { required: true, placeholder, max: 20, min: 1 });
  try {
    await interaction.showModal(modal.build());
  } catch {
    return null;
  }
  try {
    const submitted = await interaction.awaitModalSubmit({
      filter: (m) => m.user.id === interaction.user.id && m.customId === modalId,
      time: MODAL_TIME
    });
    const value = parseAmountInput(submitted.fields.getTextInputValue(inputId));
    if (!value || value <= 0) {
      await submitted.reply({ content: '❌ Geçersiz miktar girdiniz.', ephemeral: true }).catch(() => {});
      return null;
    }
    return { submitted, value };
  } catch {
    return null;
  }
}

/* ============================== VIEWS ============================== */

async function bankSelectView(manager, userId) {
  const banks = await listActiveBanks();
  const accounts = await getAccountsOf(userId);
  const registered = new Set(accounts.map((a) => a.bankId));

  const ordered = [...banks].sort((a, b) => {
    const ra = registered.has(a.bankId) ? 0 : 1;
    const rb = registered.has(b.bankId) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (b.isCentral ? 1 : 0) - (a.isCentral ? 1 : 0);
  });

  const options = ordered.slice(0, 25).map((b) => ({
    label: b.name.slice(0, 100),
    description: registered.has(b.bankId)
      ? 'Kayıtlı hesabınız mevcut'
      : 'Hesap açmak için seç',
    value: b.bankId,
    emoji: toEmojiObj(b.emoji)
  }));

  const regLines = ordered
    .filter((b) => registered.has(b.bankId))
    .map((b) => `${b.emoji} **${b.name}**`)
    .join('\n');
  const otherLines = ordered
    .filter((b) => !registered.has(b.bankId))
    .map((b) => `${b.emoji} ${b.name}`)
    .join('\n');

  const fields = [];
  if (regLines) fields.push({ name: '📌 Kayıtlı Olduğunuz Bankalar', value: regLines, inline: false });
  if (otherLines) fields.push({ name: '🌐 Diğer Bankalar', value: otherLines, inline: false });

  const embed = manager.sender.embed({
    color: manager.sender.colors.gold,
    title: '🏦 Banka Sistemi',
    description:
      'Paranızı cüzdanınız yerine bankada tutabilirsiniz.\n' +
      '**Vadesiz hesap** anında çekilebilir, **vadeli hesap** ise belirli süre bloke edilip daha yüksek faiz verir.\n\n' +
      'Kullanmak istediğiniz bankayı menüden seçin.',
    fields: fields.length ? fields : [{ name: '🏦 Banka Yok', value: '> Henüz aktif banka bulunmuyor.', inline: false }],
    footer: { text: 'Kayıtlı bankalarınız listenin başında gösterilir.' }
  });

  const components = [];
  if (options.length) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('bk_select')
      .setPlaceholder('Bir banka seçin...')
      .addOptions(options);
    components.push(new ActionRowBuilder().addComponents(menu));
  }
  return { embeds: [embed], components };
}

function buildAccountEmbed(manager, bank, account, loans, value) {
  const r = bank.rates || {};
  const ownerLabel = bank.isCentral ? 'Midnight Yönetimi' : bank.ownerName || 'Yok';

  const fields = [
    {
      name: '🏛️ Banka Bilgileri',
      value:
        `👑 Sahip (CEO): **${ownerLabel}**\n` +
        `💰 Banka Değeri: \`${fmtMoney(value.value)} coin\`\n` +
        `📈 Vadeli Faiz: 7g **%${r.d7}** · 14g **%${r.d14}** · 21g **%${r.d21}** · 30g **%${r.d30}**\n` +
        `💳 Kredi Faizi: **%${r.loan}**/gün · Gecikince **×${r.overdueMultiplier}**`,
      inline: false
    },
    {
      name: '💼 Vadesiz Hesabınız',
      value: `\`${fmtMoney(account.balance)} coin\``,
      inline: false
    }
  ];

  if (account.deposits && account.deposits.length) {
    const lines = account.deposits.map((d) => {
      const remain = new Date(d.maturesAt).getTime() - Date.now();
      return (
        `📈 \`${fmtMoney(d.amount)} coin\` · ${dayLabel(d.days)} · Günlük **%${d.dailyRate}**\n` +
        `   Vade sonu: **${fmtMoney(d.payout)} coin** · ⏳ ${fmtRemain(remain)} (${fmtDate(d.maturesAt)})`
      );
    });
    fields.push({ name: `📊 Vadeli Mevduatlar (${account.deposits.length})`, value: lines.join('\n'), inline: false });
  }

  if (loans && loans.length) {
    const lines = loans.map((l) => {
      const remain = new Date(l.dueDate).getTime() - Date.now();
      const status = l.overdue ? '⚠️ GECİKMİŞ (faiz ×' + (l.overdueMultiplier || 4) + ')' : `⏳ ${fmtRemain(remain)}`;
      return (
        `💳 Anapara: \`${fmtMoney(l.principal)} coin\` · Günlük **%${l.dailyRate}**\n` +
        `   Güncel Borç: **${fmtMoney(l.owed)} coin** · ${status}\n` +
        `   Vade: ${fmtDate(l.dueDate)}`
      );
    });
    fields.push({ name: `📉 Aktif Krediler (${loans.length})`, value: lines.join('\n'), inline: false });
  }

  return manager.sender.embed({
    color: bank.isCentral ? manager.sender.colors.darkBlue : manager.sender.colors.blueGray,
    title: `${bank.emoji} ${bank.name}`,
    description:
      `İşlem yapmak için aşağıdaki butonları kullanın.\n` +
      `Vadeli hesap açarak paranızı günlük faizle büyütebilirsiniz.`,
    fields,
    footer: { text: 'Vadesiz: anında çekim · Vadeli: süre sonunda faiziyle ödeme' }
  });
}

function buildAccountRows(disabled = false) {
  const row1 = new Button();
  row1.add('bk_yatir', 'Para Yatır', ButtonStyle.Success, '💰', disabled);
  row1.add('bk_cek', 'Para Çek', ButtonStyle.Danger, '💸', disabled);
  row1.add('bk_vadeli', 'Vadeli Hesap', ButtonStyle.Primary, '📈', disabled);

  const row2 = new Button();
  row2.add('bk_kredi', 'Kredi Çek', ButtonStyle.Primary, '💳', disabled);
  row2.add('bk_krediode', 'Kredi Öde', ButtonStyle.Secondary, '🧾', disabled);
  row2.add('bk_gecmis', 'İşlem Geçmişi', ButtonStyle.Secondary, '📜', disabled);

  const row3 = new Button();
  row3.add('bk_geri', 'Banka Seç', ButtonStyle.Secondary, '🔙', disabled);

  return [row1.build(), row2.build(), row3.build()];
}

function buildHistoryEmbed(manager, bank, account) {
  const history = [...(account.history || [])].reverse().slice(0, 15);
  const lines = [];
  if (!history.length) {
    lines.push('> Henüz hiç işlem yapmadınız.');
  } else {
    history.forEach((h, idx) => {
      const label = HISTORY_LABELS[h.type] || h.type;
      lines.push(
        `**${idx + 1}.** ${label} · \`${fmtMoney(h.amount)} coin\`\n` +
        `   ${h.note ? h.note + ' · ' : ''}⏰ ${fmtDate(h.time)}`
      );
    });
  }
  return manager.sender.embed({
    color: manager.sender.colors.purple,
    title: `📜 İşlem Geçmişi · ${bank.name}`,
    description: 'Bu bankadaki son 15 işleminiz (en yeni üstte).',
    fields: [{ name: 'Kayıtlar', value: lines.join('\n'), inline: false }],
    footer: { text: 'Yatırma, çekme, vadeli ve kredi hareketleri gösterilir.' }
  });
}

function buildTermEmbed(manager, bank, amount) {
  const r = bank.rates || {};
  const fields = [];
  for (const d of TERM_DAYS) {
    const rate = r[TERM_RATE_KEY[d]] ?? 1;
    const payout = calcTermPayout(amount, rate, d);
    fields.push({
      name: dayLabel(d),
      value: `Günlük **%${rate}** · Vade sonu: \`${fmtMoney(payout)} coin\` (+${fmtMoney(payout - amount)})`
    });
  }
  return manager.sender.embed({
    color: manager.sender.colors.mintGreen,
    title: '🏦 Vadeli Hesap Açılışı',
    description:
      `**${fmtMoney(amount)} coin** yatırıyorsunuz. Vade süresini seçin.\n` +
      `Seçtiğiniz süre boyunca para bloke edilir ve vade sonunda faiziyle cüzdanınıza yatar.`,
    fields,
    footer: { text: `${bank.name} · Vade öncesi para çekilemez` }
  });
}

function buildTermRows(amount, disabled = false) {
  const r0 = new Button();
  for (const d of TERM_DAYS) {
    r0.add(`bk_term_${d}`, `${d === 30 ? '1 Ay' : d + ' Gün'}`, ButtonStyle.Primary, null, disabled);
  }
  const r1 = new Button();
  r1.add('bk_iptal', 'İptal', ButtonStyle.Danger, '🔙', disabled);
  return [r0.build(), r1.build()];
}

function buildLoanEmbed(manager, bank, amount) {
  const r = bank.rates || {};
  const rate = r.loan ?? 2;
  const mult = r.overdueMultiplier || 4;
  const fields = [];
  for (const d of LOAN_DAYS) {
    const total = Math.floor(amount * (1 + (rate / 100) * d));
    fields.push({
      name: `${d} Gün`,
      value: `Günlük **%${rate}** · Vade sonu ödeme: \`${fmtMoney(total)} coin\``
    });
  }
  return manager.sender.embed({
    color: manager.sender.colors.liveRed,
    title: '💳 Kredi Çekimi',
    description:
      `**${fmtMoney(amount)} coin** kredi çekiyorsunuz. Ödeme vadesini seçin.\n` +
      `⚠️ Her gün borcunuza faiz eklenir. **Vade tarihi geçerse faiz ×${mult} olur!**`,
    fields,
    footer: { text: `${bank.name} · Faiz her gün anapara üzerinden işler` }
  });
}

function buildLoanRows(disabled = false) {
  const r0 = new Button();
  for (const d of LOAN_DAYS) {
    r0.add(`bk_loanday_${d}`, `${d} Gün`, ButtonStyle.Danger, null, disabled);
  }
  const r1 = new Button();
  r1.add('bk_iptal', 'İptal', ButtonStyle.Secondary, '🔙', disabled);
  return [r0.build(), r1.build()];
}

function buildPayEmbed(manager, bank, loans) {
  if (!loans.length) {
    return manager.sender.embed({
      color: manager.sender.colors.grayBlue,
      title: '🧾 Kredi Ödemesi',
      description: 'Bu bankada ödenecek aktif krediniz bulunmuyor.',
      fields: [{ name: 'Durum', value: '> Temizsiniz! 🎉', inline: false }]
    });
  }
  const lines = loans.map(
    (l, i) =>
      `**${i + 1}.** Anapara: \`${fmtMoney(l.principal)} coin\` · Borç: **${fmtMoney(l.owed)} coin**` +
      `${l.overdue ? ' ⚠️ gecikmiş' : ''}\n   Vade: ${fmtDate(l.dueDate)}`
  );
  return manager.sender.embed({
    color: manager.sender.colors.orange,
    title: '🧾 Kredi Ödemesi',
    description: 'Ödemek istediğiniz krediyi aşağıdan seçin. Borcun tamamı tek seferde ödenir.',
    fields: [{ name: 'Aktif Krediler', value: lines.join('\n'), inline: false }],
    footer: { text: `${bank.name} · Ödeme cüzdanınızdan yapılır` }
  });
}

function buildPayRows(loans, disabled = false) {
  const rows = [];
  const chunk = loans.slice(0, 4);
  const b = new Button();
  chunk.forEach((l, i) => {
    b.add(`bk_pay_${l.loanId}`, `${fmtMoney(l.owed)} coin`, ButtonStyle.Success, `${i + 1}️⃣`, disabled);
  });
  if (chunk.length) rows.push(b.build());
  const back = new Button();
  back.add('bk_hesap', 'Hesaba Dön', ButtonStyle.Secondary, '🔙', disabled);
  rows.push(back.build());
  return rows;
}



export default {
  name: 'bank',
  category: 'economy',
  aliases: ['banka'],
  usage: '.banka',
  description: 'Banka paneli: vadesiz/vadeli hesap, kredi ve banka kurulumu.',
  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;
    const sub = (args?.[0] || '').toLowerCase();

    if (['aç', 'ac', 'kur', 'olustur', 'oluştur', 'create'].includes(sub)) {
      return startBankCreation(client, message, manager);
    }

    await openBankMenu(client, message, manager, userId);
  }
};


async function openBankMenu(client, message, manager, userId) {
  let rootMsg;
  try {
    const view = await bankSelectView(manager, userId);
    rootMsg = await message.channel.send(view);
  } catch (e) {
    return manager.sender.reply(manager.sender.errorEmbed('❌ Banka paneli açılamadı.'));
  }

  let currentBankId = null;
  let pendingAmount = null;

  const loadAccount = async () => {
    const bank = await getBank(currentBankId);
    if (!bank) return null;
    const account = await getOrCreateAccount(userId, currentBankId);
    const loans = await getUserLoans(userId, currentBankId);
    const value = await computeBankValue(bank);
    return { bank, account, loans, value };
  };

  const renderAccount = async () => {
    const data = await loadAccount();
    if (!data) return null;
    return {
      embeds: [buildAccountEmbed(manager, data.bank, data.account, data.loans, data.value)],
      components: buildAccountRows(false)
    };
  };

  const editRoot = async (payload) => {
    try {
      await rootMsg.edit(payload);
    } catch (_) {}
  };

  const refreshAccount = async () => {
    const view = await renderAccount();
    if (view) await editRoot(view);
  };

  const switchTo = async (interaction, payload) => {
    try {
      await interaction.update(payload);
    } catch (_) {}
  };

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

  btnCollector.on('collect', async (i) => {
    if (i.user.id !== userId) {
      await i.reply({ content: '❌ Bu menü size ait değil.', ephemeral: true }).catch(() => {});
      return;
    }
    const id = i.customId;

    if (id === 'bk_geri') {
      currentBankId = null;
      const view = await bankSelectView(manager, userId);
      return switchTo(i, view);
    }

    if (id === 'bk_hesap') {
      return switchTo(i, await renderAccount());
    }

    const data = await loadAccount();
    if (!data) {
      return i.reply({ content: '❌ Banka bulunamadı.', ephemeral: true }).catch(() => {});
    }
    const { bank, account } = data;

  
    if (id === 'bk_yatir') {
      const res = await runAmountModal(i, 'bk_yatir', '💰 Vadesiz Para Yatırma', 'Yatırılacak miktar (coin)', 'Örn: 10000');
      if (!res) return i.deferUpdate().catch(() => {});
      const charged = await Economy.findOneAndUpdate(
        { userId, money: { $gte: res.value } },
        { $inc: { money: -res.value } },
        { new: true }
      ).catch(() => null);
      if (!charged) {
        return res.submitted.reply({ content: '❌ Yetersiz bakiye.', ephemeral: true }).catch(() => {});
      }
      const acc = await getOrCreateAccount(userId, currentBankId);
      acc.balance = (acc.balance || 0) + res.value;
      pushHistory(acc, 'deposit', res.value, `${bank.name} vadesiz hesaba yatırıldı`);
      await acc.save().catch(() => {});
      await Bank.updateOne({ bankId: currentBankId }, { $inc: { reserve: res.value } }).catch(() => {});
      await res.submitted.deferUpdate().catch(() => {});
      return refreshAccount();
    }

    
    if (id === 'bk_cek') {
      const res = await runAmountModal(i, 'bk_cek', '💸 Vadesiz Para Çekme', 'Çekilecek miktar (coin)', 'Örn: 5000');
      if (!res) return i.deferUpdate().catch(() => {});
      const fresh = await getOrCreateAccount(userId, currentBankId);
      if ((fresh.balance || 0) < res.value) {
        return res.submitted.reply({ content: '❌ Bankadaki vadesiz bakiyeniz yetersiz.', ephemeral: true }).catch(() => {});
      }
      fresh.balance -= res.value;
      pushHistory(fresh, 'withdraw', res.value, `${bank.name} vadesiz hesaptan çekildi`);
      await fresh.save().catch(() => {});
      await Economy.findOneAndUpdate({ userId }, { $inc: { money: res.value } }, { upsert: true }).catch(() => {});
      await Bank.updateOne({ bankId: currentBankId }, { $inc: { reserve: -res.value } }).catch(() => {});
      await res.submitted.deferUpdate().catch(() => {});
      return refreshAccount();
    }

  
    if (id === 'bk_vadeli') {
      const res = await runAmountModal(i, 'bk_vadeli', '🏦 Vadeli Hesap', 'Yatırılacak miktar (coin)', 'Örn: 10000');
      if (!res) return i.deferUpdate().catch(() => {});
      const eco = await Economy.findOne({ userId }).lean();
      if ((eco?.money ?? 0) < res.value) {
        return res.submitted.reply({ content: '❌ Yetersiz bakiye.', ephemeral: true }).catch(() => {});
      }
      pendingAmount = res.value;
      await res.submitted.deferUpdate().catch(() => {});
      return editRoot({
        embeds: [buildTermEmbed(manager, bank, res.value)],
        components: buildTermRows(res.value)
      });
    }


    if (id.startsWith('bk_term_')) {
      const days = Number(id.replace('bk_term_', ''));
      const amount = pendingAmount;
      if (!amount) {
        return i.reply({ content: '❌ Tutar bulunamadı, tekrar deneyin.', ephemeral: true }).catch(() => {});
      }
      const rateKey = TERM_RATE_KEY[days];
      const rate = bank.rates?.[rateKey] ?? 1;
      const payout = calcTermPayout(amount, rate, days);

      const charged = await Economy.findOneAndUpdate(
        { userId, money: { $gte: amount } },
        { $inc: { money: -amount } },
        { new: true }
      ).catch(() => null);
      if (!charged) {
        return i.reply({ content: '❌ Yetersiz bakiye.', ephemeral: true }).catch(() => {});
      }

      const acc = await getOrCreateAccount(userId, currentBankId);
      const maturesAt = new Date(Date.now() + days * MS_PER_DAY);
      acc.deposits.push({
        id: newDepositId(),
        amount,
        dailyRate: rate,
        days,
        startedAt: new Date(),
        maturesAt,
        payout
      });
      pushHistory(acc, 'term_open', amount, `${dayLabel(days)} vadeli açıldı · günlük %${rate} · vade sonu ${fmtMoney(payout)}`);
      await acc.save().catch(() => {});
      await Bank.updateOne({ bankId: currentBankId }, { $inc: { reserve: amount } }).catch(() => {});
      pendingAmount = null;

      await i.reply({
        content: `**${fmtMoney(amount)} coin** ${dayLabel(days)} vadeli hesaba yatırıldı.\nVade sonu (**${fmtDate(maturesAt)}**) ödeme: \`${fmtMoney(payout)} coin\``,
        ephemeral: true
      }).catch(() => {});
      return refreshAccount();
    }

    if (id === 'bk_iptal') {
      pendingAmount = null;
      return switchTo(i, await renderAccount());
    }

    
    if (id === 'bk_kredi') {
      const res = await runAmountModal(i, 'bk_kredi', '💳 Kredi Çekimi', 'Çekilecek kredi miktarı (coin)', 'Örn: 5000');
      if (!res) return i.deferUpdate().catch(() => {});
      if (!bank.isCentral && (bank.reserve || 0) < res.value) {
        return res.submitted.reply({
          content: `❌ Bankanın kredi verecek rezervi yetersiz. (Rezerv: ${fmtMoney(bank.reserve || 0)} coin)`,
          ephemeral: true
        }).catch(() => {});
      }
      pendingAmount = res.value;
      await res.submitted.deferUpdate().catch(() => {});
      return editRoot({
        embeds: [buildLoanEmbed(manager, bank, res.value)],
        components: buildLoanRows(false)
      });
    }

   
    if (id.startsWith('bk_loanday_')) {
      const days = Number(id.replace('bk_loanday_', ''));
      const principal = pendingAmount;
      if (!principal) {
        return i.reply({ content: '❌ Tutar bulunamadı, tekrar deneyin.', ephemeral: true }).catch(() => {});
      }
      const rate = bank.rates?.loan ?? 2;
      const mult = bank.rates?.overdueMultiplier || 4;
      const dueDate = new Date(Date.now() + days * MS_PER_DAY);

      await BankLoan.create({
        loanId: newLoanId(),
        userId,
        bankId: currentBankId,
        principal,
        dailyRate: rate,
        overdueMultiplier: mult,
        days,
        takenAt: new Date(),
        dueDate,
        owed: principal,
        status: 'active',
        lastAccruedAt: new Date()
      });

      await Economy.findOneAndUpdate({ userId }, { $inc: { money: principal } }, { upsert: true }).catch(() => {});
      if (!bank.isCentral) {
        await Bank.updateOne({ bankId: currentBankId }, { $inc: { reserve: -principal } }).catch(() => {});
      }
      const acc = await getOrCreateAccount(userId, currentBankId);
      pushHistory(acc, 'loan_take', principal, `${days} gün vadeli kredi çekildi · günlük %${rate} · son ödeme ${fmtDate(dueDate)}`);
      await acc.save().catch(() => {});
      pendingAmount = null;

      await i.reply({
        content: `✅ **${fmtMoney(principal)} coin** kredi çekildi.\nVade: **${fmtDate(dueDate)}** · Günlük faiz %${rate} · Gecikirse ×${mult}`,
        ephemeral: true
      }).catch(() => {});
      return refreshAccount();
    }

    
    if (id === 'bk_krediode') {
      const loans = await getUserLoans(userId, currentBankId);
      return switchTo(i, {
        embeds: [buildPayEmbed(manager, bank, loans)],
        components: buildPayRows(loans, false)
      });
    }

    if (id.startsWith('bk_pay_')) {
      const loanId = id.replace('bk_pay_', '');
      const loans = await getUserLoans(userId, currentBankId);
      const loan = loans.find((l) => l.loanId === loanId);
      if (!loan) {
        return i.reply({ content: '❌ Kredi bulunamadı.', ephemeral: true }).catch(() => {});
      }
      const paid = await Economy.findOneAndUpdate(
        { userId, money: { $gte: loan.owed } },
        { $inc: { money: -loan.owed } },
        { new: true }
      ).catch(() => null);
      if (!paid) {
        return i.reply({ content: `❌ Yetersiz bakiye. Gereken: ${fmtMoney(loan.owed)} coin`, ephemeral: true }).catch(() => {});
      }
      loan.status = 'paid';
      loan.paidAt = new Date();
      await loan.save().catch(() => {});
      const acc = await getOrCreateAccount(userId, currentBankId);
      pushHistory(acc, 'loan_pay', loan.owed, `Kredi ödendi · anapara ${fmtMoney(loan.principal)}`);
      await acc.save().catch(() => {});
      if (!bank.isCentral) {
        await Bank.updateOne({ bankId: currentBankId }, { $inc: { reserve: loan.owed } }).catch(() => {});
      }
      await i.reply({ content: `✅ Kredi ödendi: \`${fmtMoney(loan.owed)} coin\``, ephemeral: true }).catch(() => {});
      const freshLoans = await getUserLoans(userId, currentBankId);
      return switchTo(i, {
        embeds: [buildPayEmbed(manager, bank, freshLoans)],
        components: buildPayRows(freshLoans, false)
      });
    }

    
    if (id === 'bk_gecmis') {
      const acc = await getOrCreateAccount(userId, currentBankId);
      return switchTo(i, {
        embeds: [buildHistoryEmbed(manager, bank, acc)],
        components: (() => {
          const b = new Button();
          b.add('bk_hesap', 'Hesaba Dön', ButtonStyle.Secondary, '🔙');
          return [b.build()];
        })()
      });
    }
  });

  selCollector.on('collect', async (i) => {
    if (i.user.id !== userId) {
      await i.reply({ content: '❌ Bu menü size ait değil.', ephemeral: true }).catch(() => {});
      return;
    }
    if (i.customId !== 'bk_select') return;
    currentBankId = i.values[0];
    return switchTo(i, await renderAccount());
  });

  btnCollector.on('end', () => {
    selCollector.stop('end');
    rootMsg.edit({ components: [] }).catch(() => {});
  });
}



export async function startBankCreation(client, message, manager) {
  const userId = message.author.id;

  const already = await hasManagedBank(userId);
  if (already) {
    return manager.sender.reply(
      manager.sender.errorEmbed('❌ Zaten bir banka yönetiyorsunuz. Bir kullanıcı yalnızca **1 bankayı** yönetebilir.')
    );
  }

  const state = {
    name: null,
    partners: []
  };

  const buildEmbed = () => {
    const partnerLines = state.partners.length
      ? state.partners.map((p, i) => `**${i + 1}.** ${p.name} (\`${p.id}\`)`).join('\n')
      : '> Ortak eklenmedi.';
    return manager.sender.embed({
      color: manager.sender.colors.gold,
      title: '🏗️ Banka Kurulum Talebi',
      description:
        `Yeni bir banka kurmak için bilgileri doldurun.\n` +
        `**Zorunlu sermaye:** \`${fmtMoney(BANK_CAPITAL)} coin\` (cüzdanınızdan çekilir).`,
      fields: [
        { name: '🏷️ Banka Adı', value: state.name ? `**${state.name}**` : '> Belirlenmedi', inline: false },
        {
          name: '👑 Kurucu (CEO)',
          value: `${message.author.globalName ?? message.author.username} — faiz oranlarını belirler`,
          inline: false
        },
        { name: '👥 Ortaklar', value: partnerLines, inline: false },
        { name: '💰 Sermaye', value: `\`${fmtMoney(BANK_CAPITAL)} coin\``, inline: false }
      ],
      footer: { text: 'Ortaklar da bankayı yönetebilir (bir kişi yalnızca 1 banka yönetir).' }
    });
  };

  const buildRows = (withUserSelect = false) => {
    const rows = [];
    const r1 = new Button();
    r1.add('bc_name', 'Banka Adı', ButtonStyle.Primary, '🏷️');
    r1.add('bc_add', 'Ortak Ekle', ButtonStyle.Secondary, '👥');
    r1.add('bc_remove', 'Ortak Çıkar', ButtonStyle.Secondary, '➖', state.partners.length === 0);
    rows.push(r1.build());

    if (withUserSelect) {
      const sel = new UserSelectMenuBuilder()
        .setCustomId(mode === 'remove' ? 'bc_remove_select' : 'bc_add_select')
        .setPlaceholder(mode === 'remove' ? 'Çıkarılacak ortağı seçin...' : 'Eklenecek ortak(ları) seçin...')
        .setMinValues(1)
        .setMaxValues(mode === 'remove' ? 1 : 5);
      rows.push(new ActionRowBuilder().addComponents(sel));
    }

    const r3 = new Button();
    r3.add('bc_create', 'Bankayı Kur', ButtonStyle.Success, '✅');
    r3.add('bc_cancel', 'İptal', ButtonStyle.Danger, '✖️');
    rows.push(r3.build());
    return rows;
  };

  let rootMsg;
  try {
    rootMsg = await message.channel.send({ embeds: [buildEmbed()], components: buildRows(false) });
  } catch (e) {
    return manager.sender.reply(manager.sender.errorEmbed('❌ Kurulum paneli açılamadı.'));
  }

  let mode = null;

  const refresh = (withUserSelect = false) => {
    rootMsg.edit({ embeds: [buildEmbed()], components: buildRows(withUserSelect) }).catch(() => {});
  };

  const btnCollector = rootMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: MENU_TIME,
    filter: (i) => i.message.id === rootMsg.id
  });
  const userCollector = rootMsg.createMessageComponentCollector({
    componentType: ComponentType.UserSelect,
    time: MENU_TIME,
    filter: (i) => i.message.id === rootMsg.id
  });

  const stopAll = () => {
    btnCollector.stop('done');
    userCollector.stop('done');
  };

  btnCollector.on('collect', async (i) => {
    if (i.user.id !== userId) {
      await i.reply({ content: '❌ Bu panel size ait değil.', ephemeral: true }).catch(() => {});
      return;
    }
    const id = i.customId;

    if (id === 'bc_name') {
      const modalId = `bc_name_modal_${Date.now()}`;
      const inputId = 'bc_name_input';
      const modal = new Modal(modalId, '🏷️ Banka Adı');
      modal.add(inputId, 'Banka adı (3-32 karakter)', { required: true, placeholder: 'Örn: Anadolu Yatırım Bankası', max: 32, min: 3 });
      try {
        await i.showModal(modal.build());
      } catch {
        return;
      }
      let submitted;
      try {
        submitted = await i.awaitModalSubmit({
          filter: (m) => m.user.id === userId && m.customId === modalId,
          time: MODAL_TIME
        });
      } catch {
        return;
      }
      const name = String(submitted.fields.getTextInputValue(inputId) || '').trim().slice(0, 32);
      if (name.length < 3) {
        await submitted.reply({ content: '❌ Banka adı en az 3 karakter olmalı.', ephemeral: true }).catch(() => {});
        return;
      }
      state.name = name;
      await submitted.deferUpdate().catch(() => {});
      return refresh(false);
    }

    if (id === 'bc_add') {
      mode = 'add';
      return i.update({ components: buildRows(true) }).catch(() => {});
    }

    if (id === 'bc_remove') {
      if (!state.partners.length) return i.deferUpdate().catch(() => {});
      mode = 'remove';
      return i.update({ components: buildRows(true) }).catch(() => {});
    }

    if (id === 'bc_cancel') {
      stopAll();
      return i.update({
        embeds: [manager.sender.embed({ color: manager.sender.colors.grayBlue, title: '🏗️ İptal Edildi', description: 'Banka kurulum talebi iptal edildi.' })],
        components: []
      }).catch(() => {});
    }

    if (id === 'bc_create') {
      if (!state.name) {
        return i.reply({ content: '❌ Önce banka adını belirleyin.', ephemeral: true }).catch(() => {});
      }
      if (await hasManagedBank(userId)) {
        return i.reply({ content: '❌ Zaten bir banka yönetiyorsunuz.', ephemeral: true }).catch(() => {});
      }
      for (const p of state.partners) {
        if (await hasManagedBank(p.id)) {
          return i.reply({ content: `❌ **${p.name}** zaten başka bir bankayı yönetiyor.`, ephemeral: true }).catch(() => {});
        }
      }
      const charged = await Economy.findOneAndUpdate(
        { userId, money: { $gte: BANK_CAPITAL } },
        { $inc: { money: -BANK_CAPITAL } },
        { new: true }
      ).catch(() => null);
      if (!charged) {
        return i.reply({
          content: `❌ Yetersiz sermaye. Gereken: \`${fmtMoney(BANK_CAPITAL)} coin\``,
          ephemeral: true
        }).catch(() => {});
      }
      const ownerName = message.author.globalName ?? message.author.username;
      await Bank.create({
        bankId: makeBankId(state.name),
        name: state.name,
        emoji: '🏦',
        ownerId: userId,
        ownerName,
        partners: state.partners.map((p) => p.id),
        partnerNames: state.partners.map((p) => p.name),
        capital: BANK_CAPITAL,
        reserve: BANK_CAPITAL,
        isCentral: false,
        status: 'active',
        rates: { demand: 0, d7: 1.0, d14: 1.2, d21: 1.4, d30: 1.6, loan: 2.0, overdueMultiplier: 4 }
      });
      stopAll();
      return i.update({
        embeds: [
          manager.sender.embed({
            color: manager.sender.colors.green,
            title: 'Banka Kuruldu!',
            description:
              `**${state.name}** başarıyla kuruldu.\n` +
              `Sermaye: \`${fmtMoney(BANK_CAPITAL)} coin\` transfer edildi.\n` +
              `Bankanızı yönetmek için \`.bankam\` komutunu kullanın.`,
            fields: state.partners.length
              ? [{ name: '👥 Ortaklar', value: state.partners.map((p) => p.name).join(', '), inline: false }]
              : []
          })
        ],
        components: []
      }).catch(() => {});
    }
  });

  userCollector.on('collect', async (i) => {
    if (i.user.id !== userId) {
      await i.reply({ content: '❌ Bu panel size ait değil.', ephemeral: true }).catch(() => {});
      return;
    }
    const ids = i.values;

    if (mode === 'remove') {
      state.partners = state.partners.filter((p) => !ids.includes(p.id));
    } else {
      for (const pid of ids) {
        if (pid === userId) continue;
        if (state.partners.some((p) => p.id === pid)) continue;
        if (state.partners.length >= 5) break;
        const name = await resolveDisplayName(client, message.guild, pid);
        state.partners.push({ id: pid, name });
      }
    }
    mode = null;
    return i.update({ embeds: [buildEmbed()], components: buildRows(false) }).catch(() => {});
  });

  btnCollector.on('end', () => {
    userCollector.stop('end');
    rootMsg.edit({ components: [] }).catch(() => {});
  });
}
