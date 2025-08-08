import { Economy, Shop } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'buy',
  description: 'Mağazadan ürün satın al.',
  usage: '.buy [itemId]',
  category: 'economy',

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const userId = message.author.id;
    const itemId = args[0];

    if (!itemId || isNaN(itemId)) {
      return sender.reply(sender.errorEmbed('❌ Lütfen geçerli bir item ID gir. Örn: `.buy 1`'));
    }

    const item = await Shop.findOne({ id: parseInt(itemId) });

    if (!item) {
      return sender.reply(sender.errorEmbed('❌ Geçersiz item ID.'));
    }

    const userData = await Economy.findOne({ userId }) || new Economy({ userId });

    if (userData.money < item.price) {
      return sender.reply(sender.errorEmbed('❌ Yeterli paran yok.'));
    }

    userData.money -= item.price;

    const currentAmount = userData.inventory.get(itemId) || 0;
    userData.inventory.set(itemId, currentAmount + 1);

    userData.xp += 5;

    await userData.save();

    message.channel.send(`**${item.name}** başarıyla satın alındı.`);
  }
};
