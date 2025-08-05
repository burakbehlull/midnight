import { Economy } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'sell',
  description: 'Eşyaları satarsın.',
  usage: '.sell [itemId] [adet]',
  category: 'economy',

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const userId = message.author.id;
    const [itemId, rawAmount] = args;
	const shopItems = [
	  { id: 1, name: 'Kalp', price: 200 },
	  { id: 2, name: 'Gümüş Yüzük', price: 1000 },
	  { id: 3, name: 'Altın Yüzük', price: 10000 },
	  { id: 4, name: 'Elmas Yüzük', price: 100000 }
	];
    const item = shopItems.find(x => x.id.toString() === itemId);
    const amount = parseInt(rawAmount);
    if (!item || isNaN(amount) || amount <= 0)
      return sender.reply(sender.errorEmbed('❌ Geçerli item ve miktar gir.'));

    const user = await Economy.findOne({ userId }) || new Economy({ userId });
    const currentAmount = user.inventory.get(itemId) || 0;

    if (currentAmount < amount)
      return sender.reply(sender.errorEmbed('❌ Envanterinde yeterli eşya yok.'));

    const gain = Math.floor((item.price * amount) * 0.75);
    user.inventory.set(itemId, currentAmount - amount);
    user.money += gain;
    user.xp += 5;

    await user.save();
    message.channel.send(`__${amount}__ adet **${item.name}** satıldı. Kazanılan: 💰 **__${gain}__**`);
  }
};
