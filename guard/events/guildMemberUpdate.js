export default {
  name: 'guildMemberUpdate',
  once: false,
  async execute(client, oldMember, newMember) {
    try {
      if (!client.guardManager) return;
      
      await client.guardManager.handleProtectedRoleAssign(oldMember, newMember);
    } catch (error) {
      console.error('guildMemberUpdate event hatası:', error);
    }
  }
};
