import Manager from '#managers';
import { Economy } from '#models';
import { misc } from '#helpers';

const { delay } = misc;

const MIN_BET = 50;
const MAX_BET = 50000;

const SIDES = [
  { name: 'YAZI', emoji: '🌕', win: true },
  { name: 'TURA', emoji: '​​​​🌑', win: false },
];

export default {
  name: 'cf',
  category: 'fun',
  aliases: ['coinflip', 'yazitura', 'yazıtura', 'yt'],
  usage: '.cf <bahisMiktarı|all>',
  description: 'Yazı tura at, %50 şansla paranı 2ye katla! all = maksimum bahis.',
  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;

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
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Geçerli bir bahis miktarı belirt. Kullanım: \`.cf 500\` veya \`.cf all\``));
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

    const winSide = Math.random() < 0.52;
    const result = SIDES[winSide ? 0 : 1];

    let flipMsg;
    const header = `──── **YAZI TURA** ────\n`;
    try {
      flipMsg = await message.channel.send({
        content: `${message.author}, bahis **${amount.toLocaleString('tr-TR')}** coin ile oynuyor...\n${header}🪙 havada dönüyor...`
      });
    } catch (e) {
      return;
    }

    await delay(400);
    try { await flipMsg.edit({ content: `${message.author}, bahis **${amount.toLocaleString('tr-TR')}** coin ile oynuyor...\n${header}🪙 0` }); } catch (_) {}
    await delay(400);
    try { await flipMsg.edit({ content: `${message.author}, bahis **${amount.toLocaleString('tr-TR')}** coin ile oynuyor...\n${header}🪙 1` }); } catch (_) {}
    await delay(400);
    try { await flipMsg.edit({ content: `${message.author}, bahis **${amount.toLocaleString('tr-TR')}** coin ile oynuyor...\n${header}🪙 2` }); } catch (_) {}
    await delay(400);

    let winnings = 0;
    let net = -amount;
    let resultText = '';
    let color = manager.sender.colors.liveRed;
    let titleText = '💸 KAYBETTİN';
    let xpGain = 0;

    if (winSide) {
      winnings = amount * 2;
      net = amount;
      xpGain = 3;
      color = manager.sender.colors.green;
      titleText = '🎉 KAZANDIN!';

      try {
        await Economy.findOneAndUpdate(
          { userId },
          { $inc: { money: winnings, xp: xpGain } },
          { new: true }
        );
      } catch (e) {
        console.error('[coinflip] Ödeme hatası:', e);
      }

      resultText =
        `🪙 **${result.name}** geldi!\n` +
        `Paran 2'ye katlandı!\n` +
        `Toplam: **${winnings.toLocaleString('tr-TR')}** coin (+${net.toLocaleString('tr-TR')} NET)`;
    } else {
      resultText =
        `🪙 **${result.name}** geldi.\n` +
        `Tüm bahisini kaybettin.\n` +
        `Kayıp: **${net.toLocaleString('tr-TR')}** coin`;
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
        `──── YAZI TURA ────\n` +
        `       🪙  ${result.name}\n` +
        `\`\`\`\n` +
        `**Oyuncu:** <@${userId}>, **Bahis:** \`${amount.toLocaleString('tr-TR')}\` coin\n\n` +
        `${resultText}`,
      footer: { text: footerText }
    });

    try {
      await flipMsg.edit({
        content: '',
        embeds: [resultEmbed]
      });
    } catch (_) {}
  },
};
