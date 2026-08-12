import Manager from '#managers';
import { Economy } from '#models';

export default {
  name: 'cookie',
  description: 'Bir kullanıcıya cookie gönder.',
  usage: '.cookie @kullanıcı',
  category: 'economy',

  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const authorId = message.author.id;
    const target = message.mentions.users.first() || client.users.cache.get(args[0]);

    if (!target || target.id === authorId)
      return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir kullanıcı belirt.'));

    const now = new Date();
    const authorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });
    const targetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    const cooldown = 1000 * 60 * 60 * 24;

    const hasItem = (authorData.inventory.get('2') || 0) > 0;
    const lastUsed = new Date(authorData.cooldowns.cookie);

    if (!hasItem && now - lastUsed < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000 / 60 / 60);
      return manager.sender.reply(manager.sender.errorEmbed(`❌ ${remaining} saat sonra tekrar cookie gönderebilirsin.`));
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

    message.channel.send(`**${target.globalName || target.username}** adlı kullanıcıya 🍪 gönderdin!`);
  }
};
