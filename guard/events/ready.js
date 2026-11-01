export default {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot hazır: ${client.user.tag}`);
    console.log(`📊 Sunucu sayısı: ${client.guilds.cache.size}`);
    console.log(`👥 Kullanıcı sayısı: ${client.users.cache.size}`);
    
    if (client.backupManager) {
      await client.backupManager.initialize();
    }
    
    console.log('🛡️ Guard sistemi aktif!');
  }
};
