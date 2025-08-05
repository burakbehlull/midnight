import { Economy } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'marry',
  description: 'Bir kullanıcı ile evlen.',
  usage: '.marry @kullanıcı yüzükId',
  category: 'economy',

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const authorId = message.author.id;
    const target = message.mentions.users.first() || client.users.cache.get(args[0]);
    const ringId = args[1];

    if (!target || target.id === authorId)
      return sender.reply(sender.errorEmbed('❌ Kendinle evlenemezsin.'));

    const authorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });
    const targetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    if (authorData.marriedTo) return sender.reply(sender.errorEmbed('❌ Zaten evlisin.'));
    if (targetData.marriedTo) return sender.reply(sender.errorEmbed('❌ Bu kişi zaten evli.'));

    if (!['2', '3', '4'].includes(ringId)) return sender.reply(sender.errorEmbed('❌ Geçerli bir yüzük ID gir.'));

    const inventoryCount = authorData.inventory.get(ringId) || 0;
    if (inventoryCount < 1) return sender.reply(sender.errorEmbed('❌ Envanterinde bu yüzük yok.'));

    authorData.inventory.set(ringId, inventoryCount - 1);
    authorData.marriedTo = target.id;
    targetData.marriedTo = authorId;

    const now = new Date();
    authorData.marriageSince = now;
    targetData.marriageSince = now;

    await authorData.save();
    await targetData.save();

    sender.reply(sender.classic(`💍 Tebrikler! Artık ${target.username} ile evlisiniz!`));
  }
};
