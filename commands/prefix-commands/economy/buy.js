import Manager from '#managers';
import { Economy, Shop } from '#models';

export default {
  name: 'buy',
  description: 'Mağazadan ürün satın al.',
  usage: '.buy [itemId]',
  category: 'economy',

  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    
    const userId = message.author.id;
    const itemId = args[0];

    if (!itemId || isNaN(itemId)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Lütfen geçerli bir item ID gir. Örn: `.buy 1`'));
    }

    const item = await Shop.findOne({ id: parseInt(itemId) });

    if (!item) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Geçersiz item ID.'));
    }

    const userData = await Economy.findOne({ userId }) || new Economy({ userId });

    if (userData.money < item.price) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Yeterli paran yok.'));
    }

    userData.money -= item.price;

    if (!item.slug) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bu ürünün slug\'ı yok, satın alınamaz.'));
    }

    const currentAmount = userData.inventory.get(item.slug) || 0;
    userData.inventory.set(item.slug, currentAmount + 1);

    userData.xp += 5;

    await userData.save();

    message.channel.send(`✅ **${item.emoji || ''} ${item.name}** satın alındı! (Envantere eklendi)`);
  }
};
