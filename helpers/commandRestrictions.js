import { CommandSettings } from '#models';

function resolveContext(ctx) {
  const isInteraction = ctx?.isChatInputCommand?.() || ctx?.user;
  const isMessage = ctx?.author;

  return {
    isInteraction,
    guildId: ctx.guild?.id,
    user: isInteraction ? ctx.user : (isMessage ? ctx.author : null),
    member: ctx.member,
    channelId: ctx.channel?.id,
    channelName: ctx.channel?.name || 'unknown'
  };
}

/**
 * Komut kısıtlamalarını kontrol eder
 * @param {Message|BaseInteraction} ctx - Discord mesaj veya interaction objesi
 * @param {string} commandName - Komut adı
 * @returns {Promise<{allowed: boolean, reason: string}>}
 */
export async function checkCommandRestrictions(ctx, commandName) {
  try {
    const context = resolveContext(ctx);
    const { guildId, user, member, channelId, channelName } = context;

    if (!guildId) {
      return { allowed: true };
    }

    const settings = await CommandSettings.findOne({
      guildId,
      commandName: commandName
    });

    if (!settings) {
      return { allowed: true };
    }

    
    if (!settings.enabled) {
      return { allowed: false, reason: '❌ Bu komut devre dışı bırakılmış!' };
    }

    if (member && isExempt(member, settings)) {
      return { allowed: true };
    }

    const channelCheck = checkChannelRestriction(channelId, settings);
    if (!channelCheck.allowed) {
      return channelCheck;
    }

    const roleCheck = checkRoleRestriction(member, settings);
    if (!roleCheck.allowed) {
      return roleCheck;
    }

    const userCheck = checkUserRestriction(user?.id, settings);
    if (!userCheck.allowed) {
      return userCheck;
    }

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

  if (settings.roleMode === 'whitelist') {
    if (!settings.allowedRoles || settings.allowedRoles.length === 0) {
      return {
        allowed: false,
        reason: '❌ Bu komut için henüz izinli rol belirlenmemiş!'
      };
    }


    const hasAllowedRole = settings.allowedRoles.some(roleId =>
      memberRoles.includes(roleId)
    );


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

export async function handleAutoDelete(ctx, commandName) {
  try {
    const guildId = ctx.guild?.id;
    if (!guildId) return;

    const settings = await CommandSettings.findOne({
      guildId,
      commandName: commandName
    });

    if (settings?.autoDelete && settings.deleteAfter > 0) {
      setTimeout(async () => {
        try {
          if (ctx?.isMessage?.()) {
            await ctx.delete().catch(() => {});
          } else if (ctx?.isChatInputCommand?.() || ctx?.reply || ctx?.fetchReply) {
            try {
              const reply = await ctx.fetchReply().catch(() => null);
              if (reply) await reply.delete().catch(() => {});
            } catch {}
          }
        } catch (err) {
          console.error('Mesaj silinirken hata:', err);
        }
      }, settings.deleteAfter * 1000);
    }
  } catch (error) {
    console.error('Auto delete hatası:', error);
  }
}
