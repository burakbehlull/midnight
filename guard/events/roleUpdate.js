export default {
  name: 'roleUpdate',
  once: false,
  async execute(client, oldRole, newRole) {
    try {
      if (!client.guardManager) return;
      await client.guardManager.handleRoleUpdate(oldRole, newRole);
    } catch (error) {
      console.error('roleUpdate event hatası:', error);
    }
  }
};
