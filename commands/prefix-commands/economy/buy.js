import { Economy } from '#models';
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
	
	const shopItems = [
	  { id: 1, name: 'Kalp', price: 200 },
	  { id: 2, name: 'Gümüş Yüzük', price: 1000 },
	  { id: 3, name: 'Altın Yüzük', price: 10000 },
	  { id: 4, name: 'Elmas Yüzük', price: 100000 }
	];

    const item = shopItems.find(x => x.id.toString() === itemId);
    if (!item) return sender.reply(sender.errorEmbed('❌ Geçersiz item ID.'));

    const userData = await Economy.findOne({ userId }) || new Economy({ userId });

    if (userData.money < item.price)
      return sender.reply(sender.errorEmbed('❌ Yeterli paran yok.'));

    userData.money -= item.price;

    const currentAmount = userData.inventory.get(itemId) || 0;
    userData.inventory.set(itemId, currentAmount + 1);
    userData.xp += 5;
    await userData.save();

    message.channel.send(`**${item.name}** satın alındı.`);
  }
};
