import Manager from '#managers';
import { Economy } from '#models';

export default {
  name: 'family',
  description: 'Aile yapını, evlatlarını ve anne-babanı gösterir.',
  aliases: ['aile'],
  usage: '.family [@kullanıcı]',
  category: 'economy',
  
  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

    const userData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    const partnerId = userData.marriedTo;
    let partnerData = null;
    if (partnerId) {
      partnerData = await Economy.findOne({ userId: partnerId }).lean();
    }

    const allFosterlings = new Set([...(userData.fosterlings || [])]);
    if (partnerData?.fosterlings?.length) partnerData.fosterlings.forEach(id => allFosterlings.add(id));
    const fosterlingsList = allFosterlings.size > 0
      ? [...allFosterlings].map((id, idx) => `${idx + 1}. <@${id}>`).join('\n')
      : '_Yok_';

    let parentsText = '_Yok_';
    const parentEntry = await Economy.findOne({ fosterlings: target.id }).lean();
    if (parentEntry) {
      if (parentEntry.marriedTo) {
        parentsText = `<@${parentEntry.userId}> + <@${parentEntry.marriedTo}>`;
      } else {
        parentsText = `<@${parentEntry.userId}>`;
      }
    }

    const marriageSinceText = (() => {
      if (!userData.marriageSince || !partnerId) return '_Yok_';
      const marriedDate = new Date(userData.marriageSince);
      const diff = Math.abs(Date.now() - marriedDate.getTime());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return `<t:${Math.floor(marriedDate.getTime() / 1000)}:D> (${days} gün)`;
    })();

    const embed = manager.sender.classic(`👨‍👩‍👧‍👦 ${target.username} adlı kullanıcının aile ağacı`);
    embed.addFields(
      { name: '❤️ Eşi', value: partnerId ? `<@${partnerId}>` : '_Yok_', inline: true },
      { name: '💍 Evlenme Tarihi', value: marriageSinceText, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: '👨‍👩‍👧 Evlatları', value: fosterlingsList, inline: false },
      { name: '👨‍👩‍👦 Anne / Babası', value: parentsText, inline: false }
    );

    manager.sender.reply(embed);
  }
};
