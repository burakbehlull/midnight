export default {
  name: 'channelCreate',
  once: false,
  async execute(client, channel) {
    try {
      if (!client.guardManager) return;
      if (!channel.guild) return; 
      
      await client.guardManager.handleChannelCreate(channel);
    } catch (error) {
      console.error('channelCreate event hatası:', error);
    }
  }
};
