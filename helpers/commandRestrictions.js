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

    // Ayar yoksa izin ver
    if (!settings) {
      return { allowed: true };
    }

    // Debug log - sadece ayar varsa
    console.log(`\n[Restriction] ${commandName} | ${message.author.tag} | #${message.channel.name}`);
    
    if (!settings.enabled) {
      console.log('[Restriction] ❌ Devre dışı\n');
      return { allowed: false, reason: '❌ Bu komut devre dışı bırakılmış!' };
    }

    if (isExempt(message.member, settings)) {
      console.log('[Restriction] ✅ Muafiyet\n');
      return { allowed: true };
    }

    const channelCheck = checkChannelRestriction(message.channel.id, settings);
    if (!channelCheck.allowed) {
      console.log('[Restriction] ❌ Kanal engeli\n');
      return channelCheck;
    }

    const roleCheck = checkRoleRestriction(message.member, settings);
    if (!roleCheck.allowed) {
      console.log('[Restriction] ❌ Rol engeli\n');
      return roleCheck;
    }

    const userCheck = checkUserRestriction(message.author.id, settings);
    if (!userCheck.allowed) {
      console.log('[Restriction] ❌ Üye engeli\n');
      return userCheck;
    }

    console.log('[Restriction] ✅ İzin verildi\n');
    return { allowed: true };

  } catch (error) {
    console.error('Kısıtlama hatası:', error);
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
  console.log(`[RoleCheck] Kullanıcı: ${memberRoles.length} rol | Mod: ${settings.roleMode}`);

  if (settings.roleMode === 'whitelist') {
    if (!settings.allowedRoles || settings.allowedRoles.length === 0) {
      console.log('[RoleCheck] ⚠️ Whitelist aktif ama rol yok!');
      return {
        allowed: false,
        reason: '❌ Bu komut için henüz izinli rol belirlenmemiş!'
      };
    }

    console.log('[RoleCheck] İzinli roller:', settings.allowedRoles);
    console.log('[RoleCheck] Kullanıcı rolleri:', memberRoles);

    const hasAllowedRole = settings.allowedRoles.some(roleId =>
      memberRoles.includes(roleId)
    );

    console.log('[RoleCheck] İzinli rol var mı?', hasAllowedRole);

    if (!hasAllowedRole) {
      const roles = settings.allowedRoles.map(id => `<@&${id}>`).join(', ');
      return {
        allowed: false,
        reason: `❌ Bu komutu kullanmak için şu rollerden birine sahip olmalısınız: ${roles}`
      };
    }
  }

  if (settings.roleMode === 'blacklist') {
    if (!settings.blockedRoles || settings.blockedRoles.length === 0) {
      return { allowed: true };
    }

    const hasBlockedRole = settings.blockedRoles.some(roleId =>
      memberRoles.includes(roleId)
    );

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
