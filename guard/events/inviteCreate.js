export default {
  name: 'inviteCreate',
  once: false,
  async execute(client, invite) {
    try {
      if (!client.guardManager) return;
      
      console.log(`Davet oluşturuldu: ${invite.code}`);
    } catch (error) {
      console.error('inviteCreate event hatası:', error);
    }
  }
};
