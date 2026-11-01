export default {
  name: 'roleDelete',
  once: false,
  async execute(client, role) {
    try {
      if (!client.guardManager) return;
      await client.guardManager.handleRoleDelete(role);
    } catch (error) {
      console.error('roleDelete event hatası:', error);
    }
  }
};
