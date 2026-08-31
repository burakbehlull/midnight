import { Economy } from '#models';
import Manager from '#managers';

export default {
  name: 'heart',
  description: 'Birine kalp gönder.',
  usage: '.heart @kullanıcı',
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

    const cooldown = 1000 * 60 * 60 * 24;

    const hasItem = (authorData.inventory.get('1') || 0) > 0;
    const lastUsed = new Date(authorData.cooldowns.heart);

    if (!hasItem && now - lastUsed < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000 / 60 / 60);
      return manager.sender.reply(manager.sender.errorEmbed(`❌ ${remaining} saat sonra tekrar kalp atabilirsin.`));
    }

    if (hasItem) {
      authorData.inventory.set('1', authorData.inventory.get('1') - 1);
    } else {
      authorData.cooldowns.heart = now;
    }

    authorData.hearts += 1;
    authorData.xp += 10;
    await authorData.save();

    message.channel.send(`**${target.globalName || target.username}** adlı kullanıcıya ❤️ attın!`);
  }
};
