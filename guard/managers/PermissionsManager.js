import { PermissionFlagsBits } from 'discord.js';
import { GuildSettings } from '#models';

class PermissionsManager {
  constructor(client) {
    this.client = client;
    this.cache = new Map(); 
  }

 
  async getGuildSettings(guildId) {
    if (this.cache.has(guildId)) {
      return this.cache.get(guildId);
    }

    const settings = await GuildSettings.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    this.cache.set(guildId, settings);
    return settings;
  }

 
  updateCache(guildId, settings) {
    this.cache.set(guildId, settings);
  }

 
  clearCache(guildId) {
    this.cache.delete(guildId);
  }

  
  async getBotOwnerIds() {
    try {
      const guardConfig = await import('../config.json', { with: { type: 'json' } });
      const rootConfig = await import('../../config.json', { with: { type: 'json' } });
      return [
        ...(guardConfig.default.BOT_OWNER_IDS ?? []),
        ...(rootConfig.default.BOT_OWNER_IDS ?? [])
      ];
    } catch {
      return [];
    }
  }

 
  async isSafeUser(guildId, userId) {
    const settings = await this.getGuildSettings(guildId);
    const guild = this.client.guilds.cache.get(guildId);
    
    if (!guild) return false;

    if (guild.ownerId === userId) return true;

    const botOwnerIds = await this.getBotOwnerIds();
    if (botOwnerIds.includes(userId)) return true;

    if (settings.safeguard.safeUsers.includes(userId)) return true;

    return false;
  }

 
  async hasSafeRole(guildId, member) {
    const settings = await this.getGuildSettings(guildId);
    
    const hasSafe = member.roles.cache.some(role => 
      settings.safeguard.safeRoles.includes(role.id)
    );

    return hasSafe;
  }

 
  async isProtected(guildId, member) {
    const isSafe = await this.isSafeUser(guildId, member.id);
    if (isSafe) return true;

    const hasRole = await this.hasSafeRole(guildId, member);
    return hasRole;
  }

  
  async getExemptionStatus(guildId, userId, member = null) {
    const settings = await this.getGuildSettings(guildId);
    const guild = this.client.guilds.cache.get(guildId);

    const isServerOwner = guild?.ownerId === userId;
    const isBotOwner = (await this.getBotOwnerIds()).includes(userId);
    const inSafeUsers = settings.safeguard.safeUsers.includes(userId);

    const safeRoles = member
      ? member.roles.cache
          .filter(role => settings.safeguard.safeRoles.includes(role.id))
          .map(role => ({ id: role.id, name: role.name }))
      : [];

    return {
      isServerOwner,
      isBotOwner,
      inSafeUsers,
      safeRoles,
      isExempt: isServerOwner || isBotOwner || inSafeUsers || safeRoles.length > 0
    };
  }

 
  async isBotAllowed(guildId, botId) {
    const settings = await this.getGuildSettings(guildId);
    return settings.safeguard.allowedBots.includes(botId) ||
      settings.safeguard.whitelistBots.includes(botId);
  }

 
  async isWhitelistBot(guildId, botId) {
    const settings = await this.getGuildSettings(guildId);
    return settings.safeguard.whitelistBots.includes(botId);
  }


  async arePermissionsLocked(guildId) {
    const settings = await this.getGuildSettings(guildId);
    return settings.permissionsLocked;
  }

  
  async lockAllPermissions(guild) {
    const settings = await this.getGuildSettings(guild.id);
    
    settings.permissionsLocked = true;
    await settings.save();
    this.updateCache(guild.id, settings);

    const dangerousPermissions = [
      PermissionFlagsBits.Administrator,
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageWebhooks,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.ManageNicknames,
      PermissionFlagsBits.ManageEmojisAndStickers
    ];

    const roles = guild.roles.cache.filter(role => 
      !role.managed && 
      role.id !== guild.id && 
      role.permissions.any(dangerousPermissions)
    );

    const closedRoles = [];
    for (const [, role] of roles) {
      try {
        const isSafeRole = settings.safeguard.safeRoles.includes(role.id);
        if (isSafeRole) continue;

        const newPermissions = role.permissions.remove(dangerousPermissions);
        await role.setPermissions(newPermissions, 'Acil yetki kapatma');
        closedRoles.push(role.name);
      } catch (error) {
        console.error(`Rol yetkisi kapatılamadı: ${role.name}`, error);
      }
    }

    return closedRoles;
  }

  
  async unlockAllPermissions(guildId) {
    const settings = await this.getGuildSettings(guildId);
    settings.permissionsLocked = false;
    await settings.save();
    this.updateCache(guildId, settings);
    
    return true;
  }

 
  async removeAllPermissions(member) {
    const guild = member.guild;
    const settings = await this.getGuildSettings(guild.id);

    const rolesToRemove = member.roles.cache.filter(role =>
      role.id !== guild.id &&
      !role.managed && 
      !settings.safeguard.safeRoles.includes(role.id) 
    );

    if (rolesToRemove.size === 0) return true;

    const failed = [];
    for (const [, role] of rolesToRemove) {
      try {
        await member.roles.remove(role, 'Guard: Yetki çekme cezası');
      } catch (error) {
        failed.push(role.name);
      }
    }

    if (failed.length > 0) {
      console.error(
        `Yetki çekme başarısız (${member.user?.tag ?? member.id}): ` +
        `kaldırılamayan roller -> ${failed.join(', ')}. ` +
        'Guard botunun rolü bu rollerin ÜZERİNDE olmalı.'
      );
      return false;
    }

    return true;
  }

  /**
   * Kullanıcıyı jail'e at
   */
  async jailMember(member) {
    try {
      const settings = await this.getGuildSettings(member.guild.id);
      
      if (!settings.safeguard.jailRole) {
        console.error('Jail rolü ayarlanmamış!');
        return false;
      }

      const jailRole = member.guild.roles.cache.get(settings.safeguard.jailRole);
      if (!jailRole) {
        console.error('Jail rolü bulunamadı!');
        return false;
      }

      await member.roles.set([jailRole], 'Guard: Jail cezası');
      return true;
    } catch (error) {
      console.error('Jail uygulanamadı:', error);
      return false;
    }
  }

 
  async isGuardEnabled(guildId, guardType) {
    const settings = await this.getGuildSettings(guildId);
    
    if (!settings.safeguard.enabled) return false;

    if (settings.permissionsLocked) return true;

    switch (guardType) {
      case 'roleCreate':
      case 'roleDelete':
      case 'roleUpdate':
        return settings.guards.roleGuard[guardType.replace('role', '').toLowerCase()];
      
      case 'channelCreate':
      case 'channelDelete':
      case 'channelUpdate':
        return settings.guards.channelGuard[guardType.replace('channel', '').toLowerCase()];
      
      case 'ban':
        return settings.guards.banGuard;
      
      case 'kick':
        return settings.guards.kickGuard;
      
      case 'roleAssign':
        return settings.guards.roleAssignGuard;
      
      case 'botAdd':
        return settings.guards.botGuard;
      
      case 'guildUpdate':
        return settings.guards.guildUpdateGuard;
      
      case 'vanity':
        return settings.guards.vanityGuard;
      
      case 'spam':
        return settings.guards.spamGuard;
      
      case 'advertisement':
        return settings.guards.advertisementGuard;
      
      default:
        return false;
    }
  }

  /**
   * Rolün korumalı olup olmadığını kontrol et
   */
  async isRoleProtected(guildId, roleId) {
    const settings = await this.getGuildSettings(guildId);
    return settings.protectedRoles.includes(roleId);
  }

  /**
   * Bot sahibi veya sunucu sahibi mi kontrol et
   */
  async isOwner(guildId, userId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return false;

    if (guild.ownerId === userId) return true;

    const botOwnerIds = await this.getBotOwnerIds();
    if (botOwnerIds.includes(userId)) return true;

    return false;
  }
}

export default PermissionsManager;
