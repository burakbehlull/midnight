import { Economy } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'marry',
  description: 'Bir kullanıcı ile evlen ya da evlilik durumunu gör.',
  usage: '.marry [@kullanıcı] [yüzükId]',
  category: 'economy',

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const authorId = message.author.id;

    const authorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });

    if (authorData.marriedTo) {
      const partner = await client.users.fetch(authorData.marriedTo).catch(() => null);
      const partnerName = partner ? partner.username : 'Bilinmeyen Kullanıcı';

      const marriedDate = authorData.marriageSince ? new Date(authorData.marriageSince) : new Date();
      const diffTime = Math.abs(new Date() - marriedDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return sender.reply(
        sender.classic(`💍 **${partnerName}** ile **${diffDays}** gündür evlisiniz! ❤️`)
      );
    }

    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const ringId = args[1];

    if (!target) 
      return sender.reply(sender.errorEmbed('❌ Evlenmek istediğin kişiyi etiketlemelisin. Kullanım: `.marry @kullanıcı yüzükId`'));

    if (target.id === authorId)
      return sender.reply(sender.errorEmbed('❌ Kendinle evlenemezsin.'));

    if (target.bot)
      return sender.reply(sender.errorEmbed('❌ Bir bot ile evlenemezsin.'));

    const targetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    if (targetData.marriedTo) 
      return sender.reply(sender.errorEmbed(`❌ **${target.username}** zaten başkasıyla evli.`));

    if (!ringId || !['2', '3', '4'].includes(ringId)) 
      return sender.reply(sender.errorEmbed('❌ Geçerli bir yüzük ID girmelisin. (Örn: 2, 3 veya 4)'));

    const inventoryCount = authorData.inventory.get(ringId) || 0;
    if (inventoryCount < 1) 
      return sender.reply(sender.errorEmbed('❌ Envanterinde bu yüzükten bulunmuyor.'));

    authorData.inventory.set(ringId, inventoryCount - 1);
    
    const now = new Date();
    
    authorData.marriedTo = target.id;
    authorData.marriageSince = now;

    targetData.marriedTo = authorId;
    targetData.marriageSince = now;

    await authorData.save();
    await targetData.save();

    return sender.reply(sender.classic(`**Tebrikler!** Artık **${target.username}** ile evlisiniz! 💍`));
  }
};