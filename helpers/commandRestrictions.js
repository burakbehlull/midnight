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

    const combinedCheck = checkCombinedRoleUserRestriction(member, user?.id, settings);
    if (!combinedCheck.allowed) {
      return combinedCheck;
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

/**
 * Rol + Üye kısıtlamalarını BİRLİKTE (VEYA mantığı ile) kontrol eder
 * 
 * KURAL (Whitelist - Sadece bunlar):
 * - Hem rol whitelist hem üye whitelist açık → ROL VEYA ÜYE (ikisinden biri olması yeterli)
 * - Sadece rol whitelist açık → İzinsiz rol gerekir
 * - Sadece üye whitelist açık → İzinli üye olmak gerekir
 * 
 * KURAL (Blacklist - Bunlar hariç):
 * - Herhangi bir blacklist'te (rol veya üye) görünmek → ENGELLE
 * - Hem rol blacklist hem üye blacklist → ikisinden birinde olmak engellemek için yeterli
 * 
 * KURAL (KARIŞIK modlar - whitelist + blacklist):
 * - Önce blacklist kontrol edilir (listede varsa direkt ENGELLENİR)
 * - Sonra whitelist kontrol edilir (listede yoksa ENGELLENİR)
 */
function checkCombinedRoleUserRestriction(member, userId, settings) {
  const roleOff = settings.roleMode === 'off' || !settings.roleMode;
  const userOff = settings.userMode === 'off' || !settings.userMode;

  if (roleOff && userOff) {
    return { allowed: true };
  }

  const memberRoles = member?.roles?.cache?.map(r => r.id) || [];

  // ========================
  // 1. ADIM: BLACKLIST KONTROLÜ (Önce engel olanları eleyelim)
  // ========================
  let blockedByRole = false;
  if (settings.roleMode === 'blacklist' && settings.blockedRoles?.length > 0) {
    blockedByRole = settings.blockedRoles.some(roleId => memberRoles.includes(roleId));
  }

  let blockedByUser = false;
  if (settings.userMode === 'blacklist' && settings.blockedUsers?.length > 0) {
    blockedByUser = settings.blockedUsers.includes(userId);
  }

  if (blockedByRole || blockedByUser) {
    const reasons = [];
    if (blockedByRole) reasons.push('sahip olduğunuz rol');
    if (blockedByUser) reasons.push('kullanıcı hesabınız');
    return {
      allowed: false,
      reason: `❌ Bu komutu kullanmanız ${reasons.join(' ve ')} tarafından engellenmiş!`
    };
  }

  // ========================
  // 2. ADIM: WHITELIST KONTROLÜ (VEYA mantığı ile geçişe izin ver)
  // ========================
  const roleWhitelistOn = settings.roleMode === 'whitelist';
  const userWhitelistOn = settings.userMode === 'whitelist';

  if (!roleWhitelistOn && !userWhitelistOn) {
    return { allowed: true };
  }

  let hasRoleWhitelist = false;
  if (roleWhitelistOn) {
    if (!settings.allowedRoles || settings.allowedRoles.length === 0) {
      return {
        allowed: false,
        reason: '❌ Bu komut için henüz izinli rol belirlenmemiş!'
      };
    }
    hasRoleWhitelist = settings.allowedRoles.some(roleId => memberRoles.includes(roleId));
  }

  let hasUserWhitelist = false;
  if (userWhitelistOn) {
    if (!settings.allowedUsers || settings.allowedUsers.length === 0) {
      return {
        allowed: false,
        reason: '❌ Bu komut için henüz izinli üye belirlenmemiş!'
      };
    }
    hasUserWhitelist = settings.allowedUsers.includes(userId);
  }

  // ----- VEYA (OR) MANTIĞI -----
  // Hem rol hem üye whitelist açıksa → ikisinden BİRİ olması yeterli
  // Sadece biri açıksa → o koşulun sağlanması gerekir
  let allowed;
  if (roleWhitelistOn && userWhitelistOn) {
    allowed = hasRoleWhitelist || hasUserWhitelist;
  } else if (roleWhitelistOn) {
    allowed = hasRoleWhitelist;
  } else {
    allowed = hasUserWhitelist;
  }

  if (!allowed) {
    const parts = [];
    if (roleWhitelistOn) {
      const roles = settings.allowedRoles.map(id => `<@&${id}>`).join(', ');
      parts.push(`şu rollerden birine sahip olmalısınız: ${roles}`);
    }
    if (userWhitelistOn) {
      parts.push(`veya izin verilen üyelerden biri olmalısınız`);
    }
    return {
      allowed: false,
      reason: `❌ Bu komutu kullanmak için ${parts.join(' ')}`
    };
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
