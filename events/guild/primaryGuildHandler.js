import { Events } from 'discord.js';
import { Settings } from '#models';

export default {
  name: Events.UserUpdate,
  async execute(client, oldUser, newUser) {
    try {
      const oldGuild = oldUser.primaryGuild;
      const newGuild = newUser.primaryGuild;
      
      if (oldGuild?.identityGuildId === newGuild?.identityGuildId && 
          oldGuild?.identityEnabled === newGuild?.identityEnabled) {
        return;
      }
      
      for (const [guildId, guild] of client.guilds.cache) {
        const member = guild.members.cache.get(newUser.id);
        if (!member) continue;
        
        const settings = await Settings.findOne({ guildId });
        if (!settings?.tagRoleStatus || !settings?.tagRoleId) continue;
        
        const role = guild.roles.cache.get(settings.tagRoleId);
        if (!role) continue;
        
        if (newGuild?.identityGuildId === guildId && newGuild?.identityEnabled) {
          if (member.roles.cache.has(settings.tagRoleId)) continue;
          
          try {
            await member.roles.add(role);
          } catch (error) {
            console.error(`[Primary Guild] Rol verilemedi:`, error.message);
          }
        }
        
        if (oldGuild?.identityGuildId === guildId && oldGuild?.identityEnabled && 
            (newGuild?.identityGuildId !== guildId || !newGuild?.identityEnabled)) {
          if (!member.roles.cache.has(settings.tagRoleId)) continue;
          
          try {
            await member.roles.remove(role);
          } catch (error) {
            console.error(`[Primary Guild] Rol alınamadı:`, error.message);
          }
        }
      }
      
    } catch (error) {
      console.error('[Primary Guild] Hata:', error.message);
    }
  }
};
