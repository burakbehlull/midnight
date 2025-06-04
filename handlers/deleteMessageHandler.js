import { DeletedMessage } from '#models';

export default async function deleteMessageHandler(message) {
  try {
	   const deletedMessage = new DeletedMessage({
            messageContent: message.content,
            authorTag: message.author.tag,
            channelId: message.channel.id,
            guildId: message.guild.id
        })

        await deletedMessage.save()
        .then(() => {})
        .catch(err => console.error('Mesaj kaydedilirken hata oluştu:', err))
  } catch (err) {
    console.error(`[DELETE MESSAGE] ${message?.id} delete message verilirken hata:`, err);
  }
}
