import { Economy, Shop } from '#models';
import Manager from '#managers';
import { emoji } from '#data';

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
    const emojis = emoji.default || emoji;

    const target = message.mentions.users.first() || client.users.cache.get(args[0]);

    if (!target || target.id === authorId)
      return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir kullanıcı belirt.'));

    const now = new Date();

    const authorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });

    const cooldown = 1000 * 60 * 60 * 24;

    const heartItem = await Shop.findOne({ slug: 'heart_item' }) || await Shop.findOne({ name: /kalp/i, type: 'item' });
    const heartSlug = heartItem ? (heartItem.slug || `item_${heartItem.id}`) : null;
    
    const hasItem = heartSlug ? (authorData.inventory.get(heartSlug) || 0) > 0 : false;
    const lastUsed = new Date(authorData.cooldowns.heart);

    if (!hasItem && now - lastUsed < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000 / 60 / 60);
      return manager.sender.reply(manager.sender.errorEmbed(`❌ ${remaining} saat sonra tekrar kalp atabilirsin.`));
    }

    if (hasItem && heartSlug) {
      const currentAmount = authorData.inventory.get(heartSlug) || 0;
      authorData.inventory.set(heartSlug, currentAmount - 1);
    } else {
      authorData.cooldowns.heart = now;
    }

    const targetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });
    targetData.hearts += 1;
    await targetData.save();

    authorData.xp += 10;
    await authorData.save();

    const heartEmojis = [emojis.bearheart1, emojis.bearheart2];
    const randomHeart = heartEmojis[Math.floor(Math.random() * heartEmojis.length)] || '❤️';

    message.channel.send(`${randomHeart}\n ${message.author.globalName || message.author.username}, *${target.globalName || target.username}* adlı kullanıcıya attı!`);
  }
};
