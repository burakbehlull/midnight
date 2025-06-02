import { DeletedMessage } from '#models';

export default {
  name: 'snipe',
  description: 'Bulunduğun kanalda silinen son mesajı gösterir.',
  usage: 'snipe',
  async execute(client, message, args) {
    const channelId = message.channel.id;

    try {
      const lastDeletedMessage = await DeletedMessage.findOne({ channelId }).sort({ createdAt: -1 });

      if (!lastDeletedMessage) {
        return message.reply('❌ Bu kanalda henüz silinen bir mesaj yok!');
      }

      return message.reply(
        `💬 **Son silinen mesaj:**\n` +
        `👤 Yazan: \`${lastDeletedMessage.authorTag}\`\n` +
        `📨 Mesaj: \`${lastDeletedMessage.messageContent}\``
      );
    } catch (error) {
      console.error('Snipe hatası:', error.message);
      return message.reply('❌ Silinen mesaj alınırken bir hata oluştu.');
    }
  }
};
