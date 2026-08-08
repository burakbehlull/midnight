import { CommandSettings } from '#models';

/**
 * Komut kısıtlamalarını kontrol eder
 * @param {Message} message - Discord mesaj objesi
 * @param {string} commandName - Komut adı
 * @returns {Promise<{allowed: boolean, reason: string}>}
 */
export async function checkCommandRestrictions(message, commandName) {
  try {
    const settings = await CommandSettings.findOne({
      guildId: message.guild.id,
      commandName: commandName
    });

    // Debug log
    // console.log(`\n[CommandRestriction] ========== BAŞLANGIÇ ==========`);
    // console.log(`[CommandRestriction] Komut: ${commandName}`);
    // console.log(`[CommandRestriction] Kullanıcı: ${message.author.tag} (${message.author.id})`);
    // console.log(`[CommandRestriction] Kanal: #${message.channel.name} (${message.channel.id})`);
    // console.log('[CommandRestriction] Settings:', settings ? {
    //   channelMode: settings.channelMode,
    //   allowedChannels: settings.allowedChannels,
    //   blockedChannels: settings.blockedChannels,
    //   roleMode: settings.roleMode,
    //   allowedRoles: settings.allowedRoles,
    //   blockedRoles: settings.blockedRoles,
    //   userMode: settings.userMode,
    //   allowedUsers: settings.allowedUsers,
    //   blockedUsers: settings.blockedUsers,
    //   enabled: settings.enabled
    // } : 'YOK');

    if (!settings) {
      // console.log('[CommandRestriction] ✅ Ayar yok, izin verildi');
      // console.log(`[CommandRestriction] ========== BİTİŞ ==========\n`);
      return { allowed: true };
    }

    if (!settings.enabled) {
      // console.log('[CommandRestriction] ❌ Komut devre dışı');
      // console.log(`[CommandRestriction] ========== BİTİŞ ==========\n`);
      return { allowed: false, reason: '❌ Bu komut devre dışı bırakılmış!' };
    }

    // Yönetici muafiyeti (isteğe bağlı) - YORUMA ALINDI, istersen aktif et
    // if (message.member.permissions.has('Administrator')) {
    //   console.log('[CommandRestriction] ✅ Yönetici muafiyeti');
    //   return { allowed: true };
    // }

    if (isExempt(message.member, settings)) {
      // console.log('[CommandRestriction] ✅ Muafiyet var, izin verildi');
      // console.log(`[CommandRestriction] ========== BİTİŞ ==========\n`);
      return { allowed: true };
    }

    // console.log('[CommandRestriction] Kanal kontrolü yapılıyor...');
    const channelCheck = checkChannelRestriction(message.channel.id, settings);
    if (!channelCheck.allowed) {
      // console.log('[CommandRestriction] ❌ Kanal kısıtlaması engelledi');
      // console.log(`[CommandRestriction] ========== BİTİŞ ==========\n`);
      return channelCheck;
    }
    // console.log('[CommandRestriction] ✅ Kanal kontrolü geçti');

    // console.log('[CommandRestriction] Rol kontrolü yapılıyor...');
    const roleCheck = checkRoleRestriction(message.member, settings);
    if (!roleCheck.allowed) {
      // console.log('[CommandRestriction] ❌ Rol kısıtlaması engelledi');
      // console.log(`[CommandRestriction] ========== BİTİŞ ==========\n`);
      return roleCheck;
    }
    // console.log('[CommandRestriction] ✅ Rol kontrolü geçti');

    // console.log('[CommandRestriction] Üye kontrolü yapılıyor...');
    const userCheck = checkUserRestriction(message.author.id, settings);
    if (!userCheck.allowed) {
      // console.log('[CommandRestriction] ❌ Üye kısıtlaması engelledi');
      // console.log(`[CommandRestriction] ========== BİTİŞ ==========\n`);
      return userCheck;
    }
    console.log('[CommandRestriction] ✅ Üye kontrolü geçti');

    // console.log('[CommandRestriction] ✅✅✅ TÜM KONTROLLER GEÇTİ, İZİN VERİLDİ');
    // console.log(`[CommandRestriction] ========== BİTİŞ ==========\n`);
    return { allowed: true };

  } catch (error) {
    console.error('Kısıtlama kontrolü hatası:', error);
    return { allowed: true };
  }
}


function isExempt(member, settings) {

  if (settings.exemptUsers?.includes(member.id)) {
    return true;
  }


  if (settings.exemptRoles?.length > 0) {
    const hasExemptRole = member.roles.cache.some(role => 
      settings.exemptRoles.includes(role.id)
    );
    if (hasExemptRole) return true;
  }

  return false;
}


function checkChannelRestriction(channelId, settings) {
  if (settings.channelMode === 'off') {
    return { allowed: true };
  }

  if (settings.channelMode === 'whitelist') {
    const isAllowed = settings.allowedChannels.includes(channelId);
    if (!isAllowed) {
      const channels = settings.allowedChannels.map(id => `<#${id}>`).join(', ');
      return {
        allowed: false,
        reason: `❌ Bu komut sadece şu kanallarda kullanılabilir: ${channels}`
      };
    }
  }

  if (settings.channelMode === 'blacklist') {
    const isBlocked = settings.blockedChannels.includes(channelId);
    if (isBlocked) {
      return {
        allowed: false,
        reason: '❌ Bu komut bu kanalda kullanılamaz!'
      };
    }
  }

  return { allowed: true };
}


function checkRoleRestriction(member, settings) {
  if (settings.roleMode === 'off') {
    return { allowed: true };
  }

  const memberRoles = member.roles.cache.map(r => r.id);

//  console.log('[RoleCheck] Kullanıcı rolleri:', memberRoles);
  //console.log('[RoleCheck] Rol modu:', settings.roleMode);
  //console.log('[RoleCheck] İzinli roller:', settings.allowedRoles);
  //console.log('[RoleCheck] Engelli roller:', settings.blockedRoles);

  if (settings.roleMode === 'whitelist') {
    // Eğer whitelist aktif ama hiç rol seçilmemişse, izin verme
    if (!settings.allowedRoles || settings.allowedRoles.length === 0) {
      console.log('[RoleCheck] ⚠️ Whitelist aktif ama hiç rol seçilmemiş!');
      return {
        allowed: false,
        reason: '❌ Bu komut için henüz izinli rol belirlenmemiş!'
      };
    }

    const hasAllowedRole = settings.allowedRoles.some(roleId =>
      memberRoles.includes(roleId)
    );

    // console.log('[RoleCheck] Whitelist kontrolü - İzinli rol var mı?', hasAllowedRole);

    if (!hasAllowedRole) {
      const roles = settings.allowedRoles.map(id => `<@&${id}>`).join(', ');
      return {
        allowed: false,
        reason: `❌ Bu komutu kullanmak için şu rollerden birine sahip olmalısınız: ${roles}`
      };
    }
  }

  if (settings.roleMode === 'blacklist') {
    // Eğer blacklist aktif ama hiç rol seçilmemişse, herkese izin ver
    if (!settings.blockedRoles || settings.blockedRoles.length === 0) {
      console.log('[RoleCheck] ⚠️ Blacklist aktif ama hiç rol seçilmemiş, izin verildi');
      return { allowed: true };
    }

    const hasBlockedRole = settings.blockedRoles.some(roleId =>
      memberRoles.includes(roleId)
    );

    // console.log('[RoleCheck] Blacklist kontrolü - Engelli rol var mı?', hasBlockedRole);

    if (hasBlockedRole) {
      return {
        allowed: false,
        reason: '❌ Sahip olduğunuz rol bu komutu kullanmanıza izin vermiyor!'
      };
    }
  }

  return { allowed: true };
}


function checkUserRestriction(userId, settings) {
  if (settings.userMode === 'off') {
    return { allowed: true };
  }

  if (settings.userMode === 'whitelist') {
    const isAllowed = settings.allowedUsers.includes(userId);
    if (!isAllowed) {
      return {
        allowed: false,
        reason: '❌ Bu komutu kullanma yetkiniz yok!'
      };
    }
  }

  if (settings.userMode === 'blacklist') {
    const isBlocked = settings.blockedUsers.includes(userId);
    if (isBlocked) {
      return {
        allowed: false,
        reason: '❌ Bu komutu kullanmanız engellenmiş!'
      };
    }
  }

  return { allowed: true };
}


export async function handleAutoDelete(message, commandName) {
  try {
    const settings = await CommandSettings.findOne({
      guildId: message.guild.id,
      commandName: commandName
    });

    if (settings?.autoDelete && settings.deleteAfter > 0) {
      setTimeout(async () => {
        try {
          await message.delete();
        } catch (err) {
          console.error('Mesaj silinirken hata:', err);
        }
      }, settings.deleteAfter * 1000);
    }
  } catch (error) {
    console.error('Auto delete hatası:', error);
  }
}
