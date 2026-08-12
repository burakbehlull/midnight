import Manager from '#managers';
import { Economy, Shop } from '#models';

export default {
  name: 'sell',
  description: 'Eşyaları satarsın.',
  usage: '.sell [itemId] [adet]',
  category: 'economy',

  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;
    const [itemId, rawAmount] = args;

    const amount = parseInt(rawAmount);
    if (!itemId || isNaN(amount) || amount <= 0)
      return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli item ID ve miktar gir.'));

    const item = await Shop.findOne({ id: parseInt(itemId) });
    if (!item)
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bu ID ile bir item bulunamadı.'));

    const user = await Economy.findOne({ userId }) || new Economy({ userId });
    const currentAmount = user.inventory.get(itemId) || 0;

    if (currentAmount < amount)
      return manager.sender.reply(manager.sender.errorEmbed('❌ Envanterinde yeterli eşya yok.'));

    const gain = Math.floor((item.price * amount) * 0.75);
    user.inventory.set(itemId, currentAmount - amount);
    user.money += gain;
    user.xp += 5;

    await user.save();
    message.channel.send(`__${amount}__ adet **${item.name}** satıldı. Kazanılan: 💰 **__${gain}__**`);
  }
};
