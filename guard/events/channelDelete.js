export default {
  name: 'channelDelete',
  once: false,
  async execute(client, channel) {
    try {
      if (!client.guardManager) return;
      if (!channel.guild) return; 
      
      await client.guardManager.handleChannelDelete(channel);
    } catch (error) {
      console.error('channelDelete event hatası:', error);
    }
  }
};
