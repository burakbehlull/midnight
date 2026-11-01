export default {
  name: 'guildMemberRemove',
  once: false,
  async execute(client, member) {
    try {
      if (!client.guardManager) return;
      if (!member.guild) return;

      await client.guardManager.handleKick(member);
    } catch (error) {
      console.error('guildMemberRemove event hatası:', error);
    }
  }
};
