import { EmbedBuilder, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { GuildSettings, GuardLogs, ActionLimits, ModeratorActions } from '#models';
import Punishment from '../../models/Punishment.js';

const PUNISHMENT_TYPE_MAP = {
  ban: ['ban', 'forceban', 'godban', 'massban'],
  kick: ['kick'],
  mute: ['mute', 'vmute', 'timeout'],
  jail: ['jail'],
  warn: ['warn'],
  roleAssign: [],
  roleCreate: [],
  roleDelete: [],
  roleUpdate: [],
  channelCreate: [],
  channelDelete: [],
  channelUpdate: [],
};

class GuardManager {
  constructor(client, permissionsManager, backupManager) {
    this.client = client;
    this.perms = permissionsManager;
    this.backup = backupManager;
    this.actionQueue = new Map(); 
  }


  async getExecutor(guild, event, targetId = null) {
    const attempts = 2;
    const delayMs = 1500;
    const maxAgeMs = targetId ? 30000 : 10000;

    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const auditLogs = await guild.fetchAuditLogs({
          type: event,
          limit: 5
        });

        const entry = auditLogs.entries.find((e) =>
          Date.now() - e.createdTimestamp <= maxAgeMs &&
          (!targetId || e.target?.id === targetId) &&
          e.executor?.id !== this.client.user.id
        );

        if (entry?.executor) return entry.executor;
      } catch (error) {
        lastError = error;
      }

      if (attempt < attempts) await new Promise((r) => setTimeout(r, delayMs));
    }

    if (lastError) console.error('Audit log alınamadı:', lastError.message);
    return null;
  }

  /**
   * İşlemi yapan kişiyi çöz.
   * Whitelist botların kendi işlemleri garda takılmaz (sınırsız) -> null döner.
   * Moderation botu (aynı process'teki kardeş bot) da otomatik muaf tutulur;
   * aksi halde guard, moderation botunun meşru ban/kick işlemlerini geri alır.
   */
  async resolveExecutor(guild, auditEvent, targetId = null) {
    const executor = await this.getExecutor(guild, auditEvent, targetId);
    if (!executor) return null;

    if (process.env.BOT_ID && executor.id === process.env.BOT_ID) return null;

    if (executor.bot && await this.perms.isWhitelistBot(guild.id, executor.id)) {
      return null;
    }

    return executor;
  }

  /**
   * Limit kontrolü yap
   */
  async checkLimit(guildId, userId, actionType) {
    const settings = await this.perms.getGuildSettings(guildId);
    const maxLimit = settings.limits[actionType] ?? 0;

    const actionLimit = await ActionLimits.findOneAndUpdate(
      { guildId, userId },
      { $setOnInsert: { guildId, userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const action = actionLimit.actions[actionType];
    const now = Date.now();
    const timeWindow = 600000;

    if (now - action.lastReset.getTime() > timeWindow) {
      action.count = 0;
      action.lastReset = new Date(now);
    }

    action.count += 1;
    actionLimit.lastUpdated = new Date(now);
    await actionLimit.save();

    const globalLimit = settings.guards.globalLimit || 5;
    let totalDangerousCount = 0;
    
    for (const type of Object.keys(settings.limits)) {
      const act = actionLimit.actions[type];
      if (act && now - act.lastReset.getTime() <= timeWindow) {
        totalDangerousCount += act.count;
      }
    }

    const externalCount = await this.getModeratorActionCount(
      guildId, userId, null, timeWindow 
    );
    const punishmentCount = await this.getPunishmentActionCount(
      guildId, userId, null, timeWindow 
    );
    
    const totalGlobal = totalDangerousCount + externalCount + punishmentCount;
    const globalExceeded = totalGlobal > globalLimit;

    const currentActionExternal = await this.getModeratorActionCount(
      guildId, userId, actionType, timeWindow
    );
    const currentActionPunishment = await this.getPunishmentActionCount(
      guildId, userId, actionType, timeWindow
    );
    const totalSpecific = action.count + currentActionExternal + currentActionPunishment;

    const exceeded = totalSpecific > maxLimit || globalExceeded;

    return {
      exceeded,
      currentCount: exceeded && globalExceeded ? totalGlobal : totalSpecific,
      maxLimit: exceeded && globalExceeded ? globalLimit : maxLimit,
      isGlobal: globalExceeded
    };
  }

 
  async getLimitStatus(guildId, userId) {
    const settings = await this.perms.getGuildSettings(guildId);
    const limits = settings.toObject().limits ?? {};
    const timeWindow = 600000; 
    const now = Date.now();

    const record = await ActionLimits.findOne({ guildId, userId });

    const statuses = [];
    for (const [actionType, maxLimit] of Object.entries(limits)) {
      const max = Number(maxLimit) || 0;

      let ownCount = 0;
      const action = record?.actions?.[actionType];
      if (action && now - action.lastReset.getTime() <= timeWindow) {
        ownCount = action.count;
      }

      const externalCount = await this.getModeratorActionCount(guildId, userId, actionType, timeWindow);
      const punishmentCount = await this.getPunishmentActionCount(guildId, userId, actionType, timeWindow);
      const total = ownCount + externalCount + punishmentCount;

      statuses.push({
        action: actionType,
        current: total,
        max,
        exceeded: total > max
      });
    }

    const globalLimit = settings.guards.globalLimit || 5;
    let totalDangerousCount = 0;
    for (const type of Object.keys(limits)) {
      const act = record?.actions?.[type];
      if (act && now - act.lastReset.getTime() <= timeWindow) {
        totalDangerousCount += act.count;
      }
    }
    const externalGlobal = await this.getModeratorActionCount(guildId, userId, null, timeWindow);
    const punishmentGlobal = await this.getPunishmentActionCount(guildId, userId, null, timeWindow);
    const totalGlobal = totalDangerousCount + externalGlobal + punishmentGlobal;

    return {
      specific: statuses,
      global: {
        current: totalGlobal,
        max: globalLimit,
        exceeded: totalGlobal > globalLimit
      }
    };
  }

  /**
   * Ortak MongoDB'de kayıtlı moderatör işlem sayısını getir
   * (moderation botu gibi whitelist botların işlemleri için ortak sayaç)
   */
  async getModeratorActionCount(guildId, moderatorId, action = null, windowMs = 600000) {
    try {
      const query = {
        guildId,
        moderatorId,
        createdAt: { $gte: new Date(Date.now() - windowMs) }
      };
      if (action) query.action = action;
      return await ModeratorActions.countDocuments(query);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Moderation botunun ceza modelinden (Punishment) bir moderatörün işlem sayısını getir.
   * jail/mute/warn gibi işlemler ModeratorActions'a yazılmadığı için buradan okunur.
   */
  async getPunishmentActionCount(guildId, staffId, action = null, windowMs = 600000) {
    const types = action ? PUNISHMENT_TYPE_MAP[action] : null;
    if (action && (!types || types.length === 0)) return 0;

    try {
      const query = {
        guildId,
        staffId,
        date: { $gte: new Date(Date.now() - windowMs) }
      };
      if (types && types.length > 0) {
        query.type = { $in: types };
      } else if (!action) {
        const allTypes = Object.values(PUNISHMENT_TYPE_MAP).flat().filter(t => t);
        query.type = { $in: allTypes };
      } else {
        return 0; 
      }
      return await Punishment.countDocuments(query);
    } catch (error) {
      return 0;
    }
  }

  
  async getPunishments(guildId, eventType, limitResult = null) {
    const settings = await this.perms.getGuildSettings(guildId);

    // Limit aşımı: limit için tanımlı ceza uygulanır (varsayılan: yetki çekme)
    if (limitResult?.exceeded) {
      const configured = settings.limitPunishment;
      return Array.isArray(configured) ? [...configured] : ['removePerms'];
    }

    const config = settings.punishments[eventType];
    if (!config) return [];

    return config.actions.length > 0 ? [...config.actions] : [...config.default];
  }

  /**
   * Cezaları uygula (guard handler'ları tarafından kullanılan kısayol)
   */
  async punish(guild, member, eventType, reason, limitResult = null) {
    const actions = await this.getPunishments(guild.id, eventType, limitResult);
    return await this.executePunishments(guild, member, actions, reason);
  }

  /**
   * Cezaları uygula
   */
  async executePunishments(guild, member, punishments, reason) {
    const results = [];

    for (const punishment of punishments) {
      try {
        switch (punishment) {
          case 'ban':
            await guild.members.ban(member.id, { reason });
            results.push('ban');
            break;

          case 'kick':
            await member.kick(reason);
            results.push('kick');
            break;

          case 'removePerms': {
            const ok = await this.perms.removeAllPermissions(member);
            if (ok) results.push('removePerms');
            break;
          }

          case 'jail':
            await this.perms.jailMember(member);
            results.push('jail');
            break;

          case 'closePerms':
            await this.perms.lockAllPermissions(guild);
            results.push('closePerms');
            break;

          case 'none':
            results.push('none');
            break;
        }
      } catch (error) {
        console.error(`Ceza uygulanamadı (${punishment}):`, error);
      }
    }

    return results;
  }

  /**
   * Guard log kaydet
   */
  async logGuardAction(data) {
    let log = null;
    try {
      log = await GuardLogs.create(data);
    } catch (error) {
      console.error('Guard log kaydedilemedi:', error.message);
    }

    try {
      const settings = await this.perms.getGuildSettings(data.guildId);
      if (!settings?.logChannel) return log;

      const guild = this.client.guilds.cache.get(data.guildId)
        ?? await this.client.guilds.fetch(data.guildId).catch(() => null);
      if (!guild) {
        console.warn(`[GuardLog] Sunucu bulunamadı: ${data.guildId}`);
        return log;
      }

      const channel = guild.channels.cache.get(settings.logChannel)
        ?? await guild.channels.fetch(settings.logChannel).catch(() => null);
      if (!channel) {
        console.warn(`[GuardLog] Log kanalı bulunamadı/erişilemiyor: ${settings.logChannel}`);
        return log;
      }

      const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
      const perms = me && channel.permissionsFor ? channel.permissionsFor(me) : null;
      if (perms && !perms.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        console.warn(
          `[GuardLog] ${channel.name ?? channel.id} kanalında yetki yok ` +
          '(SendMessages + EmbedLinks gerekli).'
        );
        return log;
      }

      await channel.send({ embeds: [this.createLogEmbed(data)] });
    } catch (error) {
      console.error('Guard log mesajı gönderilemedi:', error.message);
    }

    return log;
  }

  /**
   * Log embed oluştur
   */
  createLogEmbed(data) {
    const eventNames = {
      roleCreate: '🛡️ Rol Oluşturuldu',
      roleDelete: '🛡️ Rol Silindi',
      roleUpdate: '🛡️ Rol Güncellendi',
      channelCreate: '🛡️ Kanal Oluşturuldu',
      channelDelete: '🛡️ Kanal Silindi',
      channelUpdate: '🛡️ Kanal Güncellendi',
      ban: '🛡️ Ban Atıldı',
      kick: '🛡️ Kick Atıldı',
      roleAssign: '🛡️ Rol Verildi',
      botAdd: '🛡️ Bot Eklendi',
      guildUpdate: '🛡️ Sunucu Güncellendi',
      vanityUpdate: '🛡️ Vanity URL Değiştirildi',
      spam: '🛡️ Spam Tespit Edildi',
      advertisement: '🛡️ Reklam Tespit Edildi',
      protectedRoleAssign: '🛡️ Korumalı Rol Verilmeye Çalışıldı'
    };

    const statusEmojis = {
      prevented: '✅ Engellendi',
      punished: '⚔️ Cezalandırıldı',
      logged: '📝 Kaydedildi',
      restored: '♻️ Geri Yüklendi'
    };

    const punishmentNames = {
      ban: 'Ban',
      kick: 'Kick',
      removePerms: 'Yetki Çekme',
      jail: 'Jail',
      closePerms: 'Tüm Yetkileri Kapatma',
      timeout: 'Timeout'
    };

    const embed = new EmbedBuilder()
      .setColor(data.status === 'prevented' || data.status === 'restored' ? '#00ff00' : '#ff0000')
      .setTitle(eventNames[data.eventType] || 'Guard Olayı')
      .setTimestamp(data.timestamp);

    if (data.executor) {
      embed.addFields({
        name: '👤 İşlemi Yapan',
        value: `<@${data.executor.id}> (${data.executor.tag})`,
        inline: true
      });
    }

    if (data.target) {
      embed.addFields({
        name: '🎯 Hedef',
        value: `${data.target.name} (${data.target.type})`,
        inline: true
      });
    }

    embed.addFields({
      name: '📊 Durum',
      value: statusEmojis[data.status] || data.status,
      inline: true
    });

    if (data.punishments && data.punishments.length > 0) {
      const punishmentList = data.punishments.map(p => punishmentNames[p] || p).join(', ');
      embed.addFields({
        name: '⚔️ Uygulanan Cezalar',
        value: punishmentList,
        inline: false
      });
    }

    if (data.details?.limitExceeded) {
      embed.addFields({
        name: '⚠️ Limit Bilgisi',
        value: `${data.details.currentCount}/${data.details.maxLimit} - Limit aşıldı!`,
        inline: false
      });
    }

    if (data.details?.reason) {
      embed.addFields({
        name: '📝 Detay',
        value: data.details.reason,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Rol guard - Oluşturma
   */
  async handleRoleCreate(role) {
    const guild = role.guild;
    const guildId = guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'roleCreate')) return;

    const executor = await this.resolveExecutor(guild, AuditLogEvent.RoleCreate, role.id);
    if (!executor) return;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (await this.perms.isProtected(guildId, member)) return;

    const limit = await this.checkLimit(guildId, executor.id, 'roleCreate');

    const roleName = role.name;
    await role.delete('Guard: İzinsiz rol oluşturma').catch(() => {});

    const applied = await this.punish(guild, member, 'roleCreate', 'Guard: İzinsiz rol oluşturma', limit);

    await this.logGuardAction({
      guildId,
      eventType: 'roleCreate',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: role.id, name: roleName, type: 'role' },
      punishments: applied,
      details: {
        reason: 'İzinsiz rol oluşturma (geri alındı)',
        limitExceeded: limit.exceeded,
        currentCount: limit.currentCount,
        maxLimit: limit.maxLimit
      },
      status: 'prevented'
    });
  }

  /**
   * Rol guard - Silme (En önemli - geri yükleme ile)
   */
  async handleRoleDelete(role) {
    const guild = role.guild;
    const guildId = guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'roleDelete')) return;

    const executor = await this.resolveExecutor(guild, AuditLogEvent.RoleDelete, role.id);
    if (!executor) return;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (await this.perms.isProtected(guildId, member)) return;

    const limit = await this.checkLimit(guildId, executor.id, 'roleDelete');

    const roleName = role.name;
    const members = role.members.map(m => m.id);
    const restoredRole = await this.backup.restoreDeletedRole(guild, role, members);

    const applied = await this.punish(guild, member, 'roleDelete', 'Guard: İzinsiz rol silme', limit);

    await this.logGuardAction({
      guildId,
      eventType: 'roleDelete',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: role.id, name: roleName, type: 'role' },
      punishments: applied,
      details: {
        reason: `Rol silindi ve geri yüklendi (${members.length} üyeye verildi)`,
        limitExceeded: limit.exceeded,
        currentCount: limit.currentCount,
        maxLimit: limit.maxLimit
      },
      status: restoredRole ? 'restored' : 'punished'
    });
  }

  /**
   * Rol guard - Güncelleme
   */
  async handleRoleUpdate(oldRole, newRole) {
    const guild = newRole.guild;
    const guildId = guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'roleUpdate')) return;

    const executor = await this.resolveExecutor(guild, AuditLogEvent.RoleUpdate, newRole.id);
    if (!executor) return;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (await this.perms.isProtected(guildId, member)) return;

    const dangerousChange = 
      oldRole.permissions.bitfield !== newRole.permissions.bitfield ||
      oldRole.position !== newRole.position ||
      oldRole.name !== newRole.name ||
      oldRole.color !== newRole.color ||
      oldRole.hoist !== newRole.hoist ||
      oldRole.mentionable !== newRole.mentionable;

    if (!dangerousChange) return;

    const limit = await this.checkLimit(guildId, executor.id, 'roleUpdate');

    await newRole.edit({
      name: oldRole.name,
      color: oldRole.color,
      permissions: oldRole.permissions,
      position: oldRole.position,
      hoist: oldRole.hoist,
      mentionable: oldRole.mentionable
    }, 'Guard: İzinsiz rol güncelleme').catch(() => {});

    const applied = await this.punish(guild, member, 'roleUpdate', 'Guard: İzinsiz rol güncelleme', limit);

    await this.logGuardAction({
      guildId,
      eventType: 'roleUpdate',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: newRole.id, name: oldRole.name, type: 'role' },
      punishments: applied,
      details: {
        reason: 'İzinsiz rol güncelleme (geri alındı)',
        oldValue: { permissions: oldRole.permissions.bitfield.toString(), position: oldRole.position },
        newValue: { permissions: newRole.permissions.bitfield.toString(), position: newRole.position },
        limitExceeded: limit.exceeded,
        currentCount: limit.currentCount,
        maxLimit: limit.maxLimit
      },
      status: 'prevented'
    });
  }

  /**
   * Kanal guard - Oluşturma
   */
  async handleChannelCreate(channel) {
    const guild = channel.guild;
    const guildId = guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'channelCreate')) return;

    const executor = await this.resolveExecutor(guild, AuditLogEvent.ChannelCreate, channel.id);
    if (!executor) return;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (await this.perms.isProtected(guildId, member)) return;

    const limit = await this.checkLimit(guildId, executor.id, 'channelCreate');

    const channelName = channel.name;
    await channel.delete('Guard: İzinsiz kanal oluşturma').catch(() => {});

    const applied = await this.punish(guild, member, 'channelCreate', 'Guard: İzinsiz kanal oluşturma', limit);

    await this.logGuardAction({
      guildId,
      eventType: 'channelCreate',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: channel.id, name: channelName, type: 'channel' },
      punishments: applied,
      details: {
        reason: 'İzinsiz kanal oluşturma (geri alındı)',
        limitExceeded: limit.exceeded,
        currentCount: limit.currentCount,
        maxLimit: limit.maxLimit
      },
      status: 'prevented'
    });
  }

  /**
   * Kanal guard - Silme (geri yükleme ile)
   */
  async handleChannelDelete(channel) {
    const guild = channel.guild;
    const guildId = guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'channelDelete')) return;

    const executor = await this.resolveExecutor(guild, AuditLogEvent.ChannelDelete, channel.id);
    if (!executor) return;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (await this.perms.isProtected(guildId, member)) return;

    const limit = await this.checkLimit(guildId, executor.id, 'channelDelete');

    const channelName = channel.name;
    const restored = await this.backup.restoreDeletedChannel(guild, channel);

    const applied = await this.punish(guild, member, 'channelDelete', 'Guard: İzinsiz kanal silme', limit);

    await this.logGuardAction({
      guildId,
      eventType: 'channelDelete',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: channel.id, name: channelName, type: 'channel' },
      punishments: applied,
      details: {
        reason: 'İzinsiz kanal silme (geri yüklendi)',
        limitExceeded: limit.exceeded,
        currentCount: limit.currentCount,
        maxLimit: limit.maxLimit
      },
      status: restored ? 'restored' : 'punished'
    });
  }

  /**
   * Kanal guard - Güncelleme
   */
  async handleChannelUpdate(oldChannel, newChannel) {
    const guild = newChannel.guild;
    const guildId = guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'channelUpdate')) return;

    const executor = await this.resolveExecutor(guild, AuditLogEvent.ChannelUpdate, newChannel.id);
    if (!executor) return;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (await this.perms.isProtected(guildId, member)) return;

    const overwritesChanged = 
      oldChannel.permissionOverwrites.cache.size !== newChannel.permissionOverwrites.cache.size ||
      !oldChannel.permissionOverwrites.cache.every(o => newChannel.permissionOverwrites.cache.has(o.id));

    const dangerousChange =
      oldChannel.name !== newChannel.name ||
      oldChannel.topic !== newChannel.topic ||
      oldChannel.nsfw !== newChannel.nsfw ||
      oldChannel.parentId !== newChannel.parentId ||
      oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser ||
      overwritesChanged;

    if (!dangerousChange) return;

    const limit = await this.checkLimit(guildId, executor.id, 'channelUpdate');

    await newChannel.edit({
      name: oldChannel.name,
      topic: oldChannel.topic,
      nsfw: oldChannel.nsfw,
      parent: oldChannel.parentId,
      rateLimitPerUser: oldChannel.rateLimitPerUser
    }, 'Guard: İzinsiz kanal güncelleme').catch(() => {});

    if (overwritesChanged) {
      const overwrites = Array.from(oldChannel.permissionOverwrites.cache.values()).map(o => ({
        id: o.id,
        type: o.type,
        allow: o.allow.bitfield,
        deny: o.deny.bitfield
      }));
      await newChannel.permissionOverwrites.set(overwrites, 'Guard: İzinsiz kanal güncelleme').catch(() => {});
    }

    const applied = await this.punish(guild, member, 'channelUpdate', 'Guard: İzinsiz kanal güncelleme', limit);

    await this.logGuardAction({
      guildId,
      eventType: 'channelUpdate',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: newChannel.id, name: oldChannel.name, type: 'channel' },
      punishments: applied,
      details: {
        reason: 'İzinsiz kanal güncelleme (geri alındı)',
        limitExceeded: limit.exceeded,
        currentCount: limit.currentCount,
        maxLimit: limit.maxLimit
      },
      status: 'prevented'
    });
  }

  /**
   * Ban guard
   */
  async handleBan(ban) {
    const guild = ban.guild;
    const guildId = guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'ban')) return;

    const executor = await this.resolveExecutor(guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    if (!executor) return;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (await this.perms.isProtected(guildId, member)) return;

    const limit = await this.checkLimit(guildId, executor.id, 'ban');

    await guild.members.unban(ban.user.id, 'Guard: İzinsiz ban').catch(() => {});

    const applied = await this.punish(guild, member, 'ban', 'Guard: İzinsiz ban atma', limit);

    await this.logGuardAction({
      guildId,
      eventType: 'ban',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: ban.user.id, name: ban.user.tag, type: 'user' },
      punishments: applied,
      details: {
        reason: 'İzinsiz ban atma (ban kaldırıldı)',
        limitExceeded: limit.exceeded,
        currentCount: limit.currentCount,
        maxLimit: limit.maxLimit
      },
      status: 'prevented'
    });
  }

  /**
   * Kick guard
   * guildMemberRemove hem kick hem ayrılma için tetiklenir; ayrılmalarda
   * audit log'da MemberKick kaydı olmadığı için getExecutor null döner ve
   * işlem yapılmaz. Kick geri alınamaz, bu yüzden yalnızca ceza uygulanır.
   */
  async handleKick(member) {
    const guild = member.guild;
    const guildId = guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'kick')) return;

    const executor = await this.resolveExecutor(guild, AuditLogEvent.MemberKick, member.id);
    if (!executor) return;

    const executorMember = await guild.members.fetch(executor.id).catch(() => null);
    if (!executorMember) return;

    if (await this.perms.isProtected(guildId, executorMember)) return;

    const limit = await this.checkLimit(guildId, executor.id, 'kick');

    const applied = await this.punish(guild, executorMember, 'kick', 'Guard: İzinsiz kick', limit);

    await this.logGuardAction({
      guildId,
      eventType: 'kick',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: member.id, name: member.user.tag, type: 'user' },
      punishments: applied,
      details: {
        reason: 'İzinsiz kick (üye atıldı, geri alınamaz)',
        limitExceeded: limit.exceeded,
        currentCount: limit.currentCount,
        maxLimit: limit.maxLimit
      },
      status: 'punished'
    });
  }

  /**
   * Bot ekleme guard
   */
  async handleBotAdd(member) {
    const guild = member.guild;
    const guildId = guild.id;

    if (!member.user.bot) return;
    if (!await this.perms.isGuardEnabled(guildId, 'botAdd')) return;

    if (await this.perms.isBotAllowed(guildId, member.id)) return;

    const executor = await this.resolveExecutor(guild, AuditLogEvent.BotAdd, member.id);
    if (!executor) return;

    const executorMember = await guild.members.fetch(executor.id).catch(() => null);
    if (!executorMember) return;

    if (await this.perms.isProtected(guildId, executorMember)) return;

    await member.kick('Guard: İzinsiz bot ekleme').catch(() => {});

    const applied = await this.punish(guild, executorMember, 'botAdd', 'Guard: İzinsiz bot ekleme', null);

    await this.logGuardAction({
      guildId,
      eventType: 'botAdd',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: member.id, name: member.user.tag, type: 'bot' },
      punishments: applied,
      details: { reason: 'İzinsiz bot ekleme (bot atıldı)' },
      status: 'punished'
    });
  }

  /**
   * Sunucu güncelleme guard (isim/ikon vb.)
   */
  async handleGuildUpdate(oldGuild, newGuild) {
    const guildId = newGuild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'guildUpdate')) return;

    const executor = await this.resolveExecutor(newGuild, AuditLogEvent.GuildUpdate);
    if (!executor) return;

    const member = await newGuild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (await this.perms.isProtected(guildId, member)) return;

    if (oldGuild.name !== newGuild.name) {
      await newGuild.setName(oldGuild.name, 'Guard: İzinsiz sunucu güncelleme').catch(() => {});
    }

    if (oldGuild.icon !== newGuild.icon) {
      const icon = oldGuild.icon ? oldGuild.iconURL({ size: 1024 }) : null;
      await newGuild.setIcon(icon, 'Guard: İzinsiz sunucu güncelleme').catch(() => {});
    }

    const applied = await this.punish(newGuild, member, 'guildUpdate', 'Guard: İzinsiz sunucu güncelleme', null);

    await this.logGuardAction({
      guildId,
      eventType: 'guildUpdate',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: newGuild.id, name: newGuild.name, type: 'guild' },
      punishments: applied,
      details: {
        reason: 'İzinsiz sunucu güncelleme (geri alındı)',
        oldValue: { name: oldGuild.name },
        newValue: { name: newGuild.name }
      },
      status: 'prevented'
    });
  }

  /**
   * Vanity URL guard
   */
  async handleVanityUpdate(oldGuild, newGuild) {
    const guildId = newGuild.id;

    if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return;
    if (!await this.perms.isGuardEnabled(guildId, 'vanity')) return;

    const executor = await this.resolveExecutor(newGuild, AuditLogEvent.GuildUpdate);
    if (!executor) return;

    const member = await newGuild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (await this.perms.isProtected(guildId, member)) return;

    await newGuild.setVanityCode(oldGuild.vanityURLCode, 'Guard: İzinsiz vanity değişikliği').catch(() => {});

    const applied = await this.punish(newGuild, member, 'vanityUpdate', 'Guard: İzinsiz vanity değişikliği', null);

    await this.logGuardAction({
      guildId,
      eventType: 'vanityUpdate',
      executor: { id: executor.id, tag: executor.tag },
      target: { id: newGuild.id, name: newGuild.name, type: 'guild' },
      punishments: applied,
      details: {
        reason: 'İzinsiz vanity URL değişikliği (geri alındı)',
        oldValue: oldGuild.vanityURLCode,
        newValue: newGuild.vanityURLCode
      },
      status: 'prevented'
    });
  }

  /**
   * Korumalı rol verme guard
   */
  async handleProtectedRoleAssign(oldMember, newMember) {
    const guild = newMember.guild;
    const guildId = guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'roleAssign')) return;

    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    if (addedRoles.size === 0) return;

    for (const [, role] of addedRoles) {
      if (!await this.perms.isRoleProtected(guildId, role.id)) continue;

      const executor = await this.resolveExecutor(guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
      if (!executor) continue;

      const executorMember = await guild.members.fetch(executor.id).catch(() => null);
      if (!executorMember) continue;

      if (await this.perms.isProtected(guildId, executorMember)) continue;

      await newMember.roles.remove(role, 'Guard: Korumalı rol').catch(() => {});

      const limit = await this.checkLimit(guildId, executor.id, 'roleAssign');
      const applied = await this.punish(
        guild, executorMember, 'roleAssign', 'Guard: Korumalı rol verme', limit
      );

      await this.logGuardAction({
        guildId,
        eventType: 'protectedRoleAssign',
        executor: { id: executor.id, tag: executor.tag },
        target: { id: newMember.id, name: newMember.user.tag, type: 'user' },
        punishments: applied,
        details: {
          reason: `Korumalı rol verilmeye çalışıldı: ${role.name} (geri alındı)`,
          limitExceeded: limit.exceeded,
          currentCount: limit.currentCount,
          maxLimit: limit.maxLimit
        },
        status: 'prevented'
      });
    }
  }

  /**
   * Spam guard
   */
  async handleSpam(message) {
    const guildId = message.guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'spam')) return;

    const settings = await this.perms.getGuildSettings(guildId);
    if (!settings.antiSpam.enabled) return;
    if (!message.member) return;
    if (await this.perms.isProtected(guildId, message.member)) return;

    const actionLimit = await ActionLimits.findOneAndUpdate(
      { guildId, userId: message.author.id },
      { $setOnInsert: { guildId, userId: message.author.id, recentMessages: [] } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const now = Date.now();
    actionLimit.recentMessages = actionLimit.recentMessages.filter(
      msg => now - msg.timestamp.getTime() < 5000
    );

    actionLimit.recentMessages.push({
      content: message.content,
      timestamp: new Date(now)
    });

    actionLimit.lastUpdated = new Date(now);

    if (actionLimit.recentMessages.length >= 5) {
      actionLimit.warnings.spam += 1;

      await message.delete().catch(() => {});

      if (actionLimit.warnings.spam >= settings.antiSpam.maxWarnings) {
        await message.member.timeout(
          settings.antiSpam.timeoutDuration,
          'Guard: Spam'
        ).catch(() => {});

        actionLimit.warnings.spam = 0;

        await this.logGuardAction({
          guildId,
          eventType: 'spam',
          executor: { id: message.author.id, tag: message.author.tag },
          target: { id: message.author.id, name: message.author.tag, type: 'user' },
          punishments: ['timeout'],
          details: { reason: `Spam tespit edildi (${settings.antiSpam.maxWarnings} uyarı)` },
          status: 'punished'
        });
      }
    }

    await actionLimit.save();
  }

  /**
   * Reklam guard
   */
  async handleAdvertisement(message) {
    const guildId = message.guild.id;

    if (!await this.perms.isGuardEnabled(guildId, 'advertisement')) return;

    const settings = await this.perms.getGuildSettings(guildId);
    if (!settings.antiAdvertisement.enabled) return;
    if (!message.member) return;
    if (await this.perms.isProtected(guildId, message.member)) return;

    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|dsc\.gg)\/[a-zA-Z0-9]+/gi;
    const linkRegex = /(https?:\/\/[^\s]+)/gi;
    // GIF / medya barındıran siteler reklam sayılmaz (tenor, giphy, klipy, Discord CDN)
    const mediaLinkRegex = /https?:\/\/(?:[^\s/]+\.)?(?:tenor\.com|giphy\.com|klipy\.com|discordapp\.com|discordapp\.net)\/[^\s]+/gi;

    const hasInvite = inviteRegex.test(message.content);
    const hasOtherLink = linkRegex.test(message.content.replace(mediaLinkRegex, ''));

    if (!hasInvite && !hasOtherLink) return;

    const actionLimit = await ActionLimits.findOneAndUpdate(
      { guildId, userId: message.author.id },
      { $setOnInsert: { guildId, userId: message.author.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    actionLimit.warnings.advertisement += 1;
    actionLimit.lastUpdated = new Date();
    await actionLimit.save();

    await message.delete().catch(() => {});

    if (actionLimit.warnings.advertisement >= settings.antiAdvertisement.maxWarnings) {
      await message.member.timeout(
        settings.antiAdvertisement.timeoutDuration,
        'Guard: Reklam'
      ).catch(() => {});

      actionLimit.warnings.advertisement = 0;
      await actionLimit.save();

      await this.logGuardAction({
        guildId,
        eventType: 'advertisement',
        executor: { id: message.author.id, tag: message.author.tag },
        target: { id: message.author.id, name: message.author.tag, type: 'user' },
        punishments: ['timeout'],
        details: { reason: `Reklam tespit edildi (${settings.antiAdvertisement.maxWarnings} uyarı)` },
        status: 'punished'
      });
    }
  }
}

export default GuardManager;
