import { DeletedMessage } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'snipe',
  description: 'Bulunduğun kanalda silinen son mesajları gösterir (Varsayılan: 1, Maksimum: 10).',
  usage: 'snipe [sayı]',
  async execute(client, message, args) {
    const channelId = message.channel.id;
    const sender = new messageSender(message);
    
    const count = Math.min(parseInt(args[0]) || 1, 10);

    try {
      const deletedMessages = await DeletedMessage.find({ channelId })
        .sort({ createdAt: -1 })
        .limit(count);

      if (!deletedMessages.length) {
        return sender.reply(sender.errorEmbed('❌ Bu kanalda henüz silinen mesaj yok!'));
      }

      const formattedMessages = deletedMessages.map((msg, index) => 
        `**#${index + 1}** 👤 **${msg.authorTag}**: \`${msg.messageContent}\``
      ).join('\n\n');

      return sender.reply(
        sender.classic(
		
          `**Son silinen ${deletedMessages.length} mesaj:**\n\n${formattedMessages}`
        )
      );
    } catch (error) {
      console.error('Snipe hatası:', error);
      return sender.reply(sender.errorEmbed('❌ Silinen mesajlar alınırken bir hata oluştu.'));
    }
  }
};