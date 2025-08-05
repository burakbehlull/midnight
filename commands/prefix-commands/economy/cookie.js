import { Economy } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'cookie',
  description: 'Bir kullanıcıya cookie gönder.',
  usage: '.cookie @kullanıcı',
  category: 'economy',

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const authorId = message.author.id;
    const target = message.mentions.users.first() || client.users.cache.get(args[0]);

    if (!target || target.id === authorId)
      return sender.reply(sender.errorEmbed('❌ Geçerli bir kullanıcı belirt.'));

    const now = new Date();
    const authorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });
    const targetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    const cooldown = 1000 * 60 * 60 * 24;

    const hasItem = (authorData.inventory.get('2') || 0) > 0;
    const lastUsed = new Date(authorData.cooldowns.cookie);

    if (!hasItem && now - lastUsed < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000 / 60 / 60);
      return sender.reply(sender.errorEmbed(`❌ ${remaining} saat sonra tekrar cookie gönderebilirsin.`));
    }

    if (hasItem) {
      authorData.inventory.set('2', authorData.inventory.get('2') - 1);
    } else {
      authorData.cooldowns.cookie = now;
    }

    targetData.cookies += 1;
    await targetData.save();

    authorData.xp += 10;
    await authorData.save();

    message.channel.send(`🍪 **${target.globalName || target.username}** adlı kullanıcıya cookie gönderdin!`);
  }
};
