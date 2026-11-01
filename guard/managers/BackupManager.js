import { BackupData, GuildSettings } from '#models';

class BackupManager {
  constructor(client) {
    this.client = client;
    this.backupIntervals = new Map();
  }


  async initialize() {
    console.log('Backup sistemi başlatılıyor...');
    
    for (const [guildId, guild] of this.client.guilds.cache) {
      await this.startAutoBackup(guildId);
    }

    console.log('Backup sistemi başlatıldı.');
  }


  async startAutoBackup(guildId) {
    const settings = await GuildSettings.findOne({ guildId });
    
    if (!settings || !settings.backup.enabled) {
      return;
    }

    if (this.backupIntervals.has(guildId)) {
      clearInterval(this.backupIntervals.get(guildId));
    }

    const shouldBackup = !settings.backup.lastBackup || 
      (Date.now() - settings.backup.lastBackup.getTime()) >= settings.backup.interval;
    
    if (shouldBackup) {
      await this.createBackup(guildId);
    }

    const interval = setInterval(async () => {
      await this.createBackup(guildId);
    }, settings.backup.interval);

    this.backupIntervals.set(guildId, interval);
    console.log(`Backup ayarlandı: ${guildId} - Her ${settings.backup.interval / 1000 / 60 / 60} saatte bir`);
  }

 
  stopAutoBackup(guildId) {
    if (this.backupIntervals.has(guildId)) {
      clearInterval(this.backupIntervals.get(guildId));
      this.backupIntervals.delete(guildId);
      console.log(`Backup durduruldu: ${guildId}`);
    }
  }


  async updateBackupInterval(guildId, newInterval) {
    const settings = await GuildSettings.findOne({ guildId });
    if (!settings) return false;

    settings.backup.interval = newInterval;
    await settings.save();

    if (settings.backup.enabled) {
      await this.startAutoBackup(guildId);
    }

    return true;
  }


  async createBackup(guildId) {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        console.error(`Backup hatası: Sunucu bulunamadı (${guildId})`);
        return null;
      }

      console.log(`Backup başlatıldı: ${guild.name}`);

      const roles = Array.from(guild.roles.cache.values())
        .filter(role => role.id !== guild.id)
        .map(role => ({
          id: role.id,
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          position: role.position,
          permissions: role.permissions.bitfield.toString(),
          mentionable: role.mentionable,
          icon: role.icon || null,
          unicodeEmoji: role.unicodeEmoji || null,
          members: Array.from(role.members.keys())
        }));

      const channels = Array.from(guild.channels.cache.values()).map(channel => {
        const permissionOverwrites = Array.from(channel.permissionOverwrites.cache.values()).map(overwrite => ({
          id: overwrite.id,
          type: overwrite.type,
          allow: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.bitfield.toString()
        }));

        return {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          position: channel.position,
          topic: channel.topic || null,
          nsfw: channel.nsfw || false,
          rateLimitPerUser: channel.rateLimitPerUser || 0,
          parentId: channel.parentId || null,
          permissionOverwrites,
          bitrate: channel.bitrate || null,
          userLimit: channel.userLimit || null
        };
      });

      const guildData = {
        name: guild.name,
        description: guild.description,
        icon: guild.icon,
        banner: guild.banner,
        splash: guild.splash,
        verificationLevel: guild.verificationLevel,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        explicitContentFilter: guild.explicitContentFilter,
        afkChannelId: guild.afkChannelId,
        afkTimeout: guild.afkTimeout,
        systemChannelId: guild.systemChannelId,
        vanityURLCode: guild.vanityURLCode
      };

      const emojis = Array.from(guild.emojis.cache.values()).map(emoji => ({
        id: emoji.id,
        name: emoji.name,
        animated: emoji.animated,
        url: emoji.url
      }));

      const bans = [];
      try {
        const guildBans = await guild.bans.fetch();
        for (const [, ban] of guildBans) {
          bans.push({
            userId: ban.user.id,
            reason: ban.reason || 'Sebep belirtilmemiş'
          });
        }
      } catch (error) {
        if (error.code === 50013) {
          console.log(`⚠️ Ban listesi alınamadı (yetki yok): ${guild.name}`);
        } else {
          console.error('Banlar alınamadı:', error.message);
        }
      }

      const backup = await BackupData.create({
        guildId: guild.id,
        roles,
        channels,
        guild: guildData,
        emojis,
        bans,
        backupDate: new Date()
      });

      await GuildSettings.updateOne(
        { guildId },
        { 'backup.lastBackup': new Date() }
      );

      const oldBackups = await BackupData.find({ guildId })
        .sort({ backupDate: -1 })
        .skip(10);

      if (oldBackups.length > 0) {
        const oldIds = oldBackups.map(b => b._id);
        await BackupData.deleteMany({ _id: { $in: oldIds } });
        console.log(`${oldBackups.length} eski backup temizlendi.`);
      }

      console.log(`Backup tamamlandı: ${guild.name} (${roles.length} rol, ${channels.length} kanal)`);
      return backup;

    } catch (error) {
      console.error('Backup hatası:', error);
      return null;
    }
  }

  
  async restoreBackup(guild, backupId) {
    try {
      const backup = await BackupData.findById(backupId);
      if (!backup || backup.guildId !== guild.id) {
        return { success: false, error: 'Backup bulunamadı veya sunucu eşleşmiyor.' };
      }

      console.log(`Geri yükleme başlatıldı: ${guild.name}`);
      const report = {
        roles: { created: 0, failed: 0 },
        channels: { created: 0, failed: 0 },
        members: { restored: 0, failed: 0 }
      };

      const roleMap = new Map();
      const sortedRoles = backup.roles.sort((a, b) => a.position - b.position);

      for (const roleData of sortedRoles) {
        try {
          const existingRole = guild.roles.cache.get(roleData.id);
          
          if (existingRole) {
            await existingRole.edit({
              name: roleData.name,
              color: roleData.color,
              hoist: roleData.hoist,
              permissions: roleData.permissions,
              mentionable: roleData.mentionable,
              icon: roleData.icon,
              unicodeEmoji: roleData.unicodeEmoji
            });
            roleMap.set(roleData.id, existingRole.id);
            report.roles.created++;
          } else {
            const newRole = await guild.roles.create({
              name: roleData.name,
              color: roleData.color,
              hoist: roleData.hoist,
              permissions: roleData.permissions,
              mentionable: roleData.mentionable,
              icon: roleData.icon,
              unicodeEmoji: roleData.unicodeEmoji,
              reason: 'Backup geri yükleme'
            });
            roleMap.set(roleData.id, newRole.id);
            report.roles.created++;
          }
        } catch (error) {
          console.error(`Rol geri yüklenemedi: ${roleData.name}`, error);
          report.roles.failed++;
        }
      }

      for (const roleData of sortedRoles) {
        const newRoleId = roleMap.get(roleData.id);
        if (!newRoleId || !roleData.members) continue;

        const role = guild.roles.cache.get(newRoleId);
        if (!role) continue;

        for (const memberId of roleData.members) {
          try {
            const member = await guild.members.fetch(memberId).catch(() => null);
            if (member && !member.roles.cache.has(newRoleId)) {
              await member.roles.add(role, 'Backup geri yükleme');
              report.members.restored++;
            }
          } catch (error) {
            report.members.failed++;
          }
        }
      }

      const sortedChannels = backup.channels.sort((a, b) => a.position - b.position);

      for (const channelData of sortedChannels) {
        try {
          const existingChannel = guild.channels.cache.get(channelData.id);
          
          if (!existingChannel) {
            const channelOptions = {
              name: channelData.name,
              type: channelData.type,
              position: channelData.position,
              topic: channelData.topic,
              nsfw: channelData.nsfw,
              rateLimitPerUser: channelData.rateLimitPerUser,
              parent: channelData.parentId,
              reason: 'Backup geri yükleme'
            };

            if (channelData.bitrate) channelOptions.bitrate = channelData.bitrate;
            if (channelData.userLimit) channelOptions.userLimit = channelData.userLimit;

            await guild.channels.create(channelOptions);
            report.channels.created++;
          }
        } catch (error) {
          console.error(`Kanal geri yüklenemedi: ${channelData.name}`, error);
          report.channels.failed++;
        }
      }

      console.log(`Geri yükleme tamamlandı: ${guild.name}`, report);
      return { success: true, report };

    } catch (error) {
      console.error('Geri yükleme hatası:', error);
      return { success: false, error: error.message };
    }
  }

 
  async restoreDeletedRole(guild, roleData, members = []) {
    try {
      if (members.length === 0) {
        const lastBackup = await BackupData.findOne({ guildId: guild.id })
          .sort({ backupDate: -1 });
        const savedRole = lastBackup?.roles?.find(r => r.id === roleData.id);
        if (savedRole?.members?.length) members = savedRole.members;
      }

      const newRole = await guild.roles.create({
        name: roleData.name,
        colors: { primaryColor: roleData.color ?? 0 },
        hoist: roleData.hoist,
        permissions: roleData.permissions,
        mentionable: roleData.mentionable,
        position: roleData.position,
        icon: roleData.icon,
        unicodeEmoji: roleData.unicodeEmoji,
        reason: 'Guard: Silinen rol geri yüklendi'
      });

      for (const memberId of members) {
        try {
          const member = await guild.members.fetch(memberId).catch(() => null);
          if (member) {
            await member.roles.add(newRole, 'Guard: Rol geri yükleme');
          }
        } catch (error) {
          console.error(`Üyeye rol verilemedi: ${memberId}`, error);
        }
      }

      console.log(`Rol geri yüklendi: ${roleData.name} (${members.length} üyeye verildi)`);
      return newRole;

    } catch (error) {
      console.error('Rol geri yükleme hatası:', error);
      return null;
    }
  }

 
  async restoreDeletedChannel(guild, channelData) {
    try {
      const permissionOverwrites = channelData.permissionOverwrites?.cache
        ? Array.from(channelData.permissionOverwrites.cache.values()).map(overwrite => ({
            id: overwrite.id,
            type: overwrite.type,
            allow: overwrite.allow.bitfield.toString(),
            deny: overwrite.deny.bitfield.toString()
          }))
        : [];

      const options = {
        name: channelData.name,
        type: channelData.type,
        position: channelData.position,
        permissionOverwrites,
        reason: 'Guard: Silinen kanal geri yüklendi'
      };

      if (channelData.topic) options.topic = channelData.topic;
      if (typeof channelData.nsfw === 'boolean') options.nsfw = channelData.nsfw;
      if (channelData.parentId) options.parent = channelData.parentId;
      if (channelData.rateLimitPerUser) options.rateLimitPerUser = channelData.rateLimitPerUser;
      if (channelData.bitrate) options.bitrate = channelData.bitrate;
      if (channelData.userLimit) options.userLimit = channelData.userLimit;

      const newChannel = await guild.channels.create(options);
      console.log(`Kanal geri yüklendi: ${channelData.name}`);
      return newChannel;

    } catch (error) {
      console.error('Kanal geri yükleme hatası:', error);
      return null;
    }
  }


  async getBackups(guildId, limit = 10) {
    return await BackupData.find({ guildId })
      .sort({ backupDate: -1 })
      .limit(limit);
  }


  async getLatestBackup(guildId) {
    return await BackupData.findOne({ guildId })
      .sort({ backupDate: -1 });
  }

  
  async deleteBackup(backupId) {
    try {
      await BackupData.findByIdAndDelete(backupId);
      return true;
    } catch (error) {
      console.error('Backup silme hatası:', error);
      return false;
    }
  }


  async deleteAllBackups(guildId) {
    try {
      const result = await BackupData.deleteMany({ guildId });
      return result.deletedCount;
    } catch (error) {
      console.error('Backuplar silme hatası:', error);
      return 0;
    }
  }

 
  cleanup() {
    for (const [guildId, interval] of this.backupIntervals) {
      clearInterval(interval);
    }
    this.backupIntervals.clear();
    console.log('Backup sistemi temizlendi.');
  }
}

export default BackupManager;
