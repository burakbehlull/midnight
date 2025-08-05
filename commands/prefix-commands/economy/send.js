import { Economy } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'send',
  description: 'Başka kullanıcıya para gönder.',
  usage: '.send @kullanıcı miktar',
  category: 'economy',

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const senderId = message.author.id;
    const target = message.mentions.users.first() || client.users.cache.get(args[0]);
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount <= 0) {
      return sender.reply(sender.errorEmbed('❌ Kullanıcı ve miktar belirt.'));
    }

    if (target.id === senderId) return sender.reply(sender.errorEmbed('❌ Kendine para gönderemezsin.'));

    const senderData = await Economy.findOne({ userId: senderId }) || new Economy({ userId: senderId });
    const targetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    if (senderData.money < amount) return sender.reply(sender.errorEmbed('❌ Yeterli paran yok.'));

    senderData.money -= amount;
    targetData.money += amount;
    senderData.xp += 5;
    await senderData.save();
    await targetData.save();

    message.channel.send(`${target.username} adlı kullanıcıya **__${amount}__** para gönderildi.`);
  }
};
