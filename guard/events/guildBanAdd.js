export default {
  name: 'guildBanAdd',
  once: false,
  async execute(client, ban) {
    try {
      if (!client.guardManager) return;
      
      await client.guardManager.handleBan(ban);
    } catch (error) {
      console.error('guildBanAdd event hatası:', error);
    }
  }
};
