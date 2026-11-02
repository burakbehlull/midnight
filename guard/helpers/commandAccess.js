import { GuardCommandSettings } from '#models';

const NO_PERMISSION = '❌ Bu komutu kullanmak için yetkiniz yok!';

export async function checkCommandAccess(client, member, commandName, staticPerms = {}) {
  try {
    const guildId = member?.guild?.id;
    if (!member || !guildId) return { allowed: false, reason: NO_PERMISSION };

    if (client.permissionsManager) {
      const isOwner = await client.permissionsManager.isOwner(guildId, member.id);
      if (isOwner) return { allowed: true, reason: 'owner' };
    }

    const doc = await GuardCommandSettings.findOne({ guildId, commandName }).lean();
    const memberRoleIds = member.roles?.cache?.map((r) => r.id) ?? [];


    if (doc && doc.enabled === false) {
      return { allowed: false, reason: '', silent: true };
    }

 
    if (doc?.userMode === 'blacklist' && doc.blockedUsers?.includes(member.id)) {
      return { allowed: false, reason: '❌ Bu komutu kullanmanız engellenmiş!' };
    }
    if (doc?.roleMode === 'blacklist' && doc.blockedRoles?.some((id) => memberRoleIds.includes(id))) {
      return { allowed: false, reason: '❌ Bu komutu rolünüz nedeniyle kullanamazsınız!' };
    }

  
    if (doc?.userMode === 'whitelist' && doc.allowedUsers?.includes(member.id)) {
      return { allowed: true, reason: 'user-whitelist' };
    }
    if (doc?.roleMode === 'whitelist' && doc.allowedRoles?.some((id) => memberRoleIds.includes(id))) {
      return { allowed: true, reason: 'role-whitelist' };
    }

    const guardWhitelistAllowed = doc
      ? doc.guardWhitelistAllowed === true
      : staticPerms.guardWhitelistDefault === true;

    if (guardWhitelistAllowed && client.permissionsManager) {
      const isExempt = await client.permissionsManager.isProtected(guildId, member);
      if (isExempt) return { allowed: true, reason: 'guard-whitelist' };
    }

    if (staticPerms.enabled === false) return { allowed: true, reason: 'static-open' };

    const authorities = staticPerms.authorities ?? [];
    const users = staticPerms.user ?? [];
    const roles = staticPerms.roles ?? [];

    if (users.includes(member.id)) return { allowed: true, reason: 'static-user' };
    if (roles.length > 0 && roles.some((id) => memberRoleIds.includes(id))) {
      return { allowed: true, reason: 'static-role' };
    }
    if (authorities.length > 0 && member.permissions?.any(authorities)) {
      return { allowed: true, reason: 'static-authority' };
    }

   
    return { allowed: false, reason: NO_PERMISSION };
  } catch (error) {
    console.error('Komut yetki kontrolü hatası:', error);
    return { allowed: true, reason: 'error-fallback' };
  }
}

export default { checkCommandAccess };
