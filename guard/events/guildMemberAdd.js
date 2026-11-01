export default {
  name: 'guildMemberAdd',
  once: false,
  async execute(client, member) {
    try {
      if (!client.guardManager) return;
      
      await client.guardManager.handleBotAdd(member);
    } catch (error) {
      console.error('guildMemberAdd event hatası:', error);
    }
  }
};
