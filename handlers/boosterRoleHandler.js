import { BoosterRole } from '#models';

function validateColor(color) {
  if (!color) return null;
  
  const hexRegex = /^#[0-9A-F]{6}$/i;
  if (hexRegex.test(color)) {
    return color;
  }
  
  const numColor = Number(color);
  if (!isNaN(numColor) && numColor >= 0 && numColor <= 16777215) {
    return numColor;
  }
  
  return null;
}

function validateEmojiId(emojiId) {
  if (!emojiId) return '';
  
  const emojiRegex = /^\d{17,19}$/;
  return emojiRegex.test(emojiId) ? emojiId : '';
}

async function isBooster(member) {
  return member.roles.cache.some(role => role.tags && role.tags.premiumSubscriberRole);
}

async function createBoosterRole(guild, member, roleName, color, emojiId) {
  try {
    const existingRole = await BoosterRole.findOne({
      userId: member.id,
      guildId: guild.id
    });
    
    if (existingRole) {
      return { success: false, message: 'Zaten bir rolünüz var! Önce mevcut rolünüzü silmelisiniz.' };
    }
    
    if (!roleName || roleName.length === 0) {
      return { success: false, message: 'Rol adı boş olamaz!' };
    }
    
    if (roleName.length > 100) {
      return { success: false, message: 'Rol adı çok uzun! Maksimum 100 karakter olabilir.' };
    }
    
    const validatedColor = validateColor(color);
    const validatedEmojiId = validateEmojiId(emojiId);
    
    const iconURL = validatedEmojiId 
      ? `https://cdn.discordapp.com/emojis/${validatedEmojiId}.png?size=96&quality=lossless` 
      : undefined;
    
    const discordRole = await guild.roles.create({
      name: roleName,
      color: validatedColor || undefined,
      icon: iconURL,
      reason: `Booster özel rolü - ${member.user.username}`
    });
    
    await member.roles.add(discordRole.id);
    
    await BoosterRole.create({
      userId: member.id,
      guildId: guild.id,
      roleId: discordRole.id,
      roleName: roleName,
      emojiId: validatedEmojiId,
      members: [member.id]
    });
    
    return { 
      success: true, 
      message: `**${roleName}** rolü başarıyla oluşturuldu ve size verildi!`,
      role: discordRole
    };
  } catch (error) {
    console.error('Booster rol oluşturma hatası:', error);
    return { success: false, message: 'Rol oluştururken bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

async function editBoosterRole(guild, member, roleName, color, emojiId) {
  try {
    const boosterRole = await BoosterRole.findOne({
      userId: member.id,
      guildId: guild.id
    });
    
    if (!boosterRole) {
      return { success: false, message: 'Henüz bir rolünüz yok! Önce rol oluşturmalısınız.' };
    }
    
    const discordRole = guild.roles.cache.get(boosterRole.roleId);
    if (!discordRole) {
      return { success: false, message: 'Rol Discord\'da bulunamadı. Rol silinmiş olabilir.' };
    }
    
    const validatedColor = validateColor(color);
    const validatedEmojiId = validateEmojiId(emojiId);
    
    const iconURL = validatedEmojiId 
      ? `https://cdn.discordapp.com/emojis/${validatedEmojiId}.png?size=96&quality=lossless` 
      : undefined;
    
    await discordRole.edit({
      name: roleName || discordRole.name,
      color: validatedColor !== null ? validatedColor : discordRole.color,
      icon: iconURL
    });
    
    boosterRole.roleName = roleName || boosterRole.roleName;
    boosterRole.emojiId = validatedEmojiId;
    boosterRole.lastEdited = new Date();
    await boosterRole.save();
    
    return { 
      success: true, 
      message: `✅ **${discordRole.name}** rolü başarıyla düzenlendi!`
    };
  } catch (error) {
    console.error('Booster rol düzenleme hatası:', error);
    return { success: false, message: 'Rol düzenlenirken bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

async function deleteBoosterRole(guild, member) {
  try {
    const boosterRole = await BoosterRole.findOne({
      userId: member.id,
      guildId: guild.id
    });
    
    if (!boosterRole) {
      return { success: false, message: 'Silinecek bir rolünüz yok!' };
    }
    
    const discordRole = guild.roles.cache.get(boosterRole.roleId);
    if (discordRole) {
      await discordRole.delete('Booster rolü silindi');
    }
    
    await BoosterRole.deleteOne({ _id: boosterRole._id });
    
    return { 
      success: true, 
      message: '✅ Rolünüz başarıyla silindi!'
    };
  } catch (error) {
    console.error('Booster rol silme hatası:', error);
    return { success: false, message: 'Rol silinirken bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

async function addMemberToRole(guild, ownerMember, targetUserId) {
  try {
    const boosterRole = await BoosterRole.findOne({
      userId: ownerMember.id,
      guildId: guild.id
    });
    
    if (!boosterRole) {
      return { success: false, message: 'Henüz bir rolünüz yok!' };
    }
    
    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return { success: false, message: 'Kullanıcı bulunamadı! Geçerli bir kullanıcı ID\'si girin.' };
    }
    
    if (boosterRole.members.includes(targetUserId)) {
      return { success: false, message: 'Bu kullanıcı zaten rolünüzde!' };
    }
    
    const discordRole = guild.roles.cache.get(boosterRole.roleId);
    if (!discordRole) {
      return { success: false, message: 'Rol Discord\'da bulunamadı.' };
    }
    
    await targetMember.roles.add(discordRole.id);
    
    boosterRole.members.push(targetUserId);
    await boosterRole.save();
    
    return { 
      success: true, 
      message: `${targetMember.user.username} rolünüze başarıyla eklendi!`
    };
  } catch (error) {
    console.error('Booster rol üye ekleme hatası:', error);
    return { success: false, message: 'Üye eklenirken bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

async function changeNickname(member, newNickname) {
  try {
    if (!newNickname || newNickname.trim().length === 0) {
      return { success: false, message: 'Yeni isim boş olamaz!' };
    }
    
    if (newNickname.length > 32) {
      return { success: false, message: 'İsim çok uzun! Maksimum 32 karakter olabilir.' };
    }
    
    await member.setNickname(newNickname);
    
    return { 
      success: true, 
      message: `İsminiz **${newNickname}** olarak değiştirildi!`
    };
  } catch (error) {
    console.error('İsim değiştirme hatası:', error);
    
    if (error.code === 50013) {
      return { success: false, message: 'İsminizi değiştirmek için yeterli yetkim yok!' };
    }
    
    return { success: false, message: 'İsim değiştirilirken bir hata oluştu.' };
  }
}

async function getRoleInfo(guild, member) {
  try {
    const boosterRole = await BoosterRole.findOne({
      userId: member.id,
      guildId: guild.id
    });
    
    if (!boosterRole) {
      return { success: false, message: 'Henüz bir rolünüz yok!' };
    }
    
    const discordRole = guild.roles.cache.get(boosterRole.roleId);
    if (!discordRole) {
      return { success: false, message: 'Rol Discord\'da bulunamadı.' };
    }
    
    const memberList = [];
    for (const memberId of boosterRole.members) {
      const m = await guild.members.fetch(memberId).catch(() => null);
      if (m) {
        memberList.push(`<@${memberId}>`);
      }
    }
    
    return {
      success: true,
      roleData: {
        role: discordRole,
        name: boosterRole.roleName,
        color: discordRole.hexColor,
        emojiId: boosterRole.emojiId,
        createdAt: boosterRole.createdAt,
        lastEdited: boosterRole.lastEdited,
        memberCount: boosterRole.members.length,
        members: memberList.join(', ') || 'Henüz kimse yok'
      }
    };
  } catch (error) {
    console.error('Rol bilgisi alma hatası:', error);
    return { success: false, message: 'Rol bilgisi alınırken bir hata oluştu.' };
  }
}

export {
  isBooster,
  createBoosterRole,
  editBoosterRole,
  deleteBoosterRole,
  addMemberToRole,
  changeNickname,
  getRoleInfo
};
