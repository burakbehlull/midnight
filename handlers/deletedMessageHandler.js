import { DeletedMessage } from '#models';

export default async function deletedMessageHandler(client, message) {
  
    try {
      if (message.partial) {
        try {
          await message.fetch();
        } catch (error) {
          console.log('[Deleted Message] Could not fetch partial message, skipping...');
          return;
        }
      }

      if (!message.author) {
        console.log('[Deleted Message] Message has no author, skipping...');
        return;
      }

      if (message.author.bot) return;
      
      if (!message.guild) return;

      const deletedMsg = new DeletedMessage({
        messageId: message.id,
        guildId: message.guild.id,
        channelId: message.channel.id,
        channelName: message.channel.name,
        userId: message.author.id,
        username: message.author.username,
        globalName: message.author.globalName || null,
        avatar: message.author.displayAvatarURL({ size: 128 }),
        content: message.content || null,
        attachments: message.attachments.map(att => ({
          url: att.url,
          proxyUrl: att.proxyURL,
          filename: att.name,
          contentType: att.contentType,
          size: att.size
        })),
        embeds: message.embeds.map(e => e.toJSON()),
        createdAt: message.createdAt
      });

      await deletedMsg.save();
      console.log(`[Deleted Message] Saved: ${message.author.username} in #${message.channel.name}`);

    } catch (error) {
      console.error('Error saving deleted message:', error);
    }
  console.log('Deleted Message Handler loaded');
}
