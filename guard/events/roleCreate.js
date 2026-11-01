export default {
  name: 'roleCreate',
  once: false,
  async execute(client, role) {
    try {
      if (!client.guardManager) return;
      await client.guardManager.handleRoleCreate(role);
    } catch (error) {
      console.error('roleCreate event hatası:', error);
    }
  }
};
