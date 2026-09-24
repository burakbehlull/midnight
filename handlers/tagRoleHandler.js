import { Settings } from '#models';

export default async function tagRoleHandler(oldMember, newMember) {
  try {
    const guildId = newMember.guild.id;
    

    const settings = await Settings.findOne({ guildId });
    

    if (!settings || !settings.tagRoleStatus || !settings.tagRoleId) {
      return;
    }

    const tagRoleId = settings.tagRoleId;
    const role = newMember.guild.roles.cache.get(tagRoleId);
    
    if (!role) {
      console.log(`[Guild Badge] ❌ Rol bulunamadı: ${tagRoleId}`);
      return;
    }
    

    const oldBoosting = oldMember.premiumSince;
    const newBoosting = newMember.premiumSince;
    

    const oldGuildAvatar = oldMember.avatar;
    const newGuildAvatar = newMember.avatar;
    
    if (!oldGuildAvatar && newGuildAvatar) {
      if (newMember.roles.cache.has(tagRoleId)) {
        return;
      }
      
      try {
        await newMember.roles.add(role);
        
        try {
          await newMember.send(`Tebrikler! **${newMember.guild.name}** sunucusunu profilinde gösterdiğin için **${role.name}** rolü verildi!`);
        } catch (error) {
        }
      } catch (error) {
        console.error(`[Guild Badge] ❌ Rol verilirken hata:`, error);
      }
    }
    
    if (oldGuildAvatar && !newGuildAvatar) {
      if (!newMember.roles.cache.has(tagRoleId)) {
        return;
      }
      
      try {
        await newMember.roles.remove(role);
      } catch (error) {
        console.error(`[Guild Badge] ❌ Rol alınırken hata:`, error);
      }
    }
    
  } catch (error) {
    console.error('[Guild Badge] ❌ Handler hatası:', error);
  }
}
