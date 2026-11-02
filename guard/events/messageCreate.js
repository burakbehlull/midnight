import { checkCommandAccess } from '../helpers/commandAccess.js';

export default {
  name: 'messageCreate',
  once: false,
  async execute(client, message) {
    try {
      if (message.author.bot) return;
      
      if (!message.guild) return;
      
      const PREFIX = process.env.GUARD_PREFIX || process.env.PREFIX || '!';
      
      if (message.content.startsWith(PREFIX)) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = client.prefixCommands.get(commandName);
        
        if (command) {
          
          if (!command.noPermissionCheck && client.permissionsManager) {
            const access = await checkCommandAccess(client, message.member, command.name, command.permissions);
            if (!access.allowed) {
              // Eğer silent flag varsa hiçbir tepki verme
              if (!access.silent) {
                await message.reply(access.reason || '❌ Bu komutu kullanmak için yetkiniz yok!').catch(() => {});
              }
              return;
            }
          }

          try {
            await command.execute(client, message, args);
          } catch (error) {
            console.error(`Prefix komut hatası (${commandName}):`, error);
            await message.reply('❌ Komut çalıştırılırken bir hata oluştu!').catch(() => {});
          }
          return; 
        }
      }
      
      if (!client.guardManager) return;
      
      await client.guardManager.handleSpam(message);
      
      await client.guardManager.handleAdvertisement(message);
    } catch (error) {
      console.error('messageCreate event hatası:', error);
    }
  }
};
