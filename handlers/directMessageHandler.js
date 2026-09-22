import { DirectMessage } from '#models';

export default async function directMessageHandler(client, message) {
  
    try {
      if (message.guild) return;
      
      if (message.author.id === client.user.id) return;
      
      if (message.author.bot) return;

      const dm = new DirectMessage({
        userId: message.author.id,
        username: message.author.username,
        globalName: message.author.globalName || null,
        avatar: message.author.displayAvatarURL({ size: 128 }),
        messageContent: message.content,
        messageId: message.id
      });

      await dm.save();
      console.log(`[DM] Received from ${message.author.username}: ${message.content}`);

    } catch (error) {
      console.error('Error saving DM:', error);
    }
  

  console.log('Direct Message Handler loaded');
}
