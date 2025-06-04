import { DeletedMessage } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'snipe',
  description: 'Bulunduğun kanalda silinen son mesajı gösterir.',
  usage: 'snipe',
  async execute(client, message, args) {
    const channelId = message.channel.id;
	const sender = new messageSender(message);
    try {
      const lastDeletedMessage = await DeletedMessage.findOne({ channelId }).sort({ createdAt: -1 });

      if (!lastDeletedMessage) return sender.reply(sender.errorEmbed('❌ Bu kanalda henüz silinen bir mesaj yok!'));
      

      return sender.reply(
		sender.classic(
        `💬 **Son silinen mesaj:**\n` +
        `👤 Yazan: \`${lastDeletedMessage.authorTag}\`\n` +
        `📨 Mesaj: \`${lastDeletedMessage.messageContent}\``
      ));
    } catch (error) {
      console.error('Snipe hatası:', error.message);
      return sender.reply(sender.errorEmbed('❌ Silinen mesaj alınırken bir hata oluştu.'));
    }
  }
};
