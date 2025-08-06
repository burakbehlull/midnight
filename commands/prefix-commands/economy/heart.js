import { Economy } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'heart',
  description: 'Birine kalp gönder.',
  usage: '.heart @kullanıcı',
  category: 'economy',

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const authorId = message.author.id;

    const target = message.mentions.users.first() || client.users.cache.get(args[0]);

    if (!target || target.id === authorId)
      return sender.reply(sender.errorEmbed('❌ Geçerli bir kullanıcı belirt.'));

    const now = new Date();

    const authorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });

    const cooldown = 1000 * 60 * 60 * 24; // 24 saat

    const hasItem = (authorData.inventory.get('1') || 0) > 0;
    const lastUsed = new Date(authorData.cooldowns.heart);

    if (!hasItem && now - lastUsed < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000 / 60 / 60);
      return sender.reply(sender.errorEmbed(`❌ ${remaining} saat sonra tekrar kalp atabilirsin.`));
    }

    if (hasItem) {
      authorData.inventory.set('1', authorData.inventory.get('1') - 1);
    } else {
      authorData.cooldowns.heart = now;
    }

    authorData.hearts += 1;
    authorData.xp += 10;
    await authorData.save();

    message.channel.send(`❤️ **${target.globalName || target.username}** adlı kullanıcıya kalp attın!`);
  }
};
