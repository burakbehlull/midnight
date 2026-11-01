export default {
  name: 'channelUpdate',
  once: false,
  async execute(client, oldChannel, newChannel) {
    try {
      if (!client.guardManager) return;
      if (!newChannel.guild) return; 
      
      await client.guardManager.handleChannelUpdate(oldChannel, newChannel);
    } catch (error) {
      console.error('channelUpdate event hatası:', error);
    }
  }
};
