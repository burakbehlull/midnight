import express from 'express';

import {
  GuildSettings,
  GuardLogs,
  ActionLimits,
  ModeratorActions,
  BackupData,
  GuardCommandSettings,
} from '../../guard/models/index.js';

import Punishment from '../../models/Punishment.js';

const COMMAND_SETTING_FIELDS = [
  'roleMode', 'allowedRoles', 'blockedRoles',
  'userMode', 'allowedUsers', 'blockedUsers',
  'exemptUsers', 'exemptRoles', 'guardWhitelistAllowed', 'enabled',
];


const HIDDEN_PERMISSION_COMMANDS = ['guard-panel'];

const SETTINGS_KEYS = [
  'safeguard',
  'backup',
  'guards',
  'limits',
  'protectedRoles',
  'punishments',
  'antiSpam',
  'antiAdvertisement',
  'logChannel',
  'permissionsLocked',
];

function normalizePunishmentType(type) {
  if (['forceban', 'godban', 'massban'].includes(type)) return 'ban';
  if (['mute', 'vmute', 'timeout'].includes(type)) return 'mute';
  return type;
}

async function resolveUserNames(client, ids) {
  const map = {};
  if (!client) return map;

  const unique = [...new Set(ids.filter(Boolean))];
  await Promise.all(
    unique.map(async (id) => {
      const user = await client.users.fetch(id).catch(() => null);
      map[id] = user
        ? {
            username: user.username,
            globalName: user.globalName || null,
            avatar: user.displayAvatarURL({ size: 64 }),
          }
        : null;
    })
  );
  return map;
}


function buildGuardCommandList(guardClient) {
  const list = [];
  if (!guardClient?.prefixCommands) return list;

  const seen = new Set();
  for (const [key, cmd] of guardClient.prefixCommands.entries()) {
    if (cmd.name !== key || seen.has(cmd.name)) continue;
    if (cmd.noPermissionCheck || HIDDEN_PERMISSION_COMMANDS.includes(cmd.name)) continue;
    seen.add(cmd.name);
    list.push({
      name: cmd.name,
      description: cmd.description || 'Açıklama yok',
      category: cmd.category || 'guard',
      guardWhitelistDefault: cmd.permissions?.guardWhitelistDefault === true,
    });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}


function defaultCommandSettings(guildId, meta) {
  return {
    guildId,
    commandName: meta.name,
    roleMode: 'off',
    allowedRoles: [],
    blockedRoles: [],
    userMode: 'off',
    allowedUsers: [],
    blockedUsers: [],
    exemptUsers: [],
    exemptRoles: [],
    guardWhitelistAllowed: meta.guardWhitelistDefault === true,
    enabled: true,
  };
}

export default function createGuardRouter(guardClient) {
  const router = express.Router();

 
  router.get('/health', (req, res) => {
    const online = !!guardClient?.isReady?.();
    res.json({
      status: online ? 'online' : 'offline',
      bot: guardClient?.user
        ? {
            id: guardClient.user.id,
            tag: guardClient.user.tag,
            avatar: guardClient.user.displayAvatarURL({ size: 128 }),
          }
        : null,
      guildCount: guardClient?.guilds?.cache?.size ?? 0,
    });
  });

 
  router.get('/guilds', async (req, res) => {
    try {
      const guilds = guardClient ? Array.from(guardClient.guilds.cache.values()) : [];
      const ids = guilds.map((g) => g.id);
      const settingsList = await GuildSettings.find({ guildId: { $in: ids } }).lean();
      const settingsMap = new Map(settingsList.map((s) => [s.guildId, s]));

      res.json(
        guilds.map((guild) => {
          const settings = settingsMap.get(guild.id);
          return {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 128 }),
            memberCount: guild.memberCount,
            ownerId: guild.ownerId,
            safeguardEnabled: settings?.safeguard?.enabled ?? false,
            backupEnabled: settings?.backup?.enabled ?? false,
            logChannel: settings?.logChannel ?? null,
          };
        })
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  
  router.get('/guilds/:guildId/channels', async (req, res) => {
    try {
      const guild = guardClient?.guilds?.cache?.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });

      const channels = guild.channels.cache
        .filter((c) => c.type === 0 || c.type === 5) 
        .map((c) => ({ id: c.id, name: c.name, type: c.type, position: c.position }))
        .sort((a, b) => a.position - b.position);

      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/guilds/:guildId/roles', async (req, res) => {
    try {
      const guild = guardClient?.guilds?.cache?.get(req.params.guildId);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });

      const roles = guild.roles.cache
        .filter((r) => r.id !== guild.id)
        .map((r) => ({
          id: r.id,
          name: r.name,
          color: r.color,
          hexColor: r.hexColor,
          position: r.position,
          managed: r.managed,
        }))
        .sort((a, b) => b.position - a.position);

      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


  router.get('/guilds/:guildId/settings', async (req, res) => {
    try {
      const { guildId } = req.params;
      const settings = await GuildSettings.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/guilds/:guildId/settings', async (req, res) => {
    try {
      const { guildId } = req.params;
      const update = {};
      for (const key of SETTINGS_KEYS) {
        if (req.body[key] !== undefined) update[key] = req.body[key];
      }
      update.updatedAt = new Date();

      const settings = await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

     
      guardClient?.permissionsManager?.clearCache?.(guildId);

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  
  router.get('/guilds/:guildId/logs', async (req, res) => {
    try {
      const { guildId } = req.params;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const { eventType, status, executorId, before } = req.query;

      const query = { guildId };
      if (eventType) query.eventType = eventType;
      if (status) query.status = status;
      if (executorId) query['executor.id'] = executorId;
      if (before) query.timestamp = { $lt: new Date(before) };

      const logs = await GuardLogs.find(query).sort({ timestamp: -1 }).limit(limit).lean();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/guilds/:guildId/logs/stats', async (req, res) => {
    try {
      const { guildId } = req.params;
      const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [byType, byStatus, total] = await Promise.all([
        GuardLogs.aggregate([
          { $match: { guildId, timestamp: { $gte: since } } },
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        GuardLogs.aggregate([
          { $match: { guildId, timestamp: { $gte: since } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        GuardLogs.countDocuments({ guildId, timestamp: { $gte: since } }),
      ]);

      res.json({
        periodDays: days,
        total,
        byType: Object.fromEntries(byType.map((r) => [r._id, r.count])),
        byStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.count])),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


  router.get('/guilds/:guildId/moderators', async (req, res) => {
    try {
      const { guildId } = req.params;
      const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [moderatorActions, punishments] = await Promise.all([
        ModeratorActions.aggregate([
          { $match: { guildId, createdAt: { $gte: since } } },
          { $group: { _id: { moderatorId: '$moderatorId', action: '$action' }, count: { $sum: 1 } } },
        ]),
        Punishment.aggregate([
          { $match: { guildId, type: { $nin: ['ban', 'kick'] }, date: { $gte: since } } },
          { $group: { _id: { moderatorId: '$staffId', action: '$type' }, count: { $sum: 1 } } },
        ]),
      ]);

      const map = new Map();

      const add = (moderatorId, action, count) => {
        if (!moderatorId) return;
        if (!map.has(moderatorId)) {
          map.set(moderatorId, { moderatorId, total: 0, actions: {} });
        }
        const entry = map.get(moderatorId);
        entry.actions[action] = (entry.actions[action] || 0) + count;
        entry.total += count;
      };

      moderatorActions.forEach((r) => add(r._id.moderatorId, r._id.action, r.count));
      punishments.forEach((r) => add(r._id.moderatorId, normalizePunishmentType(r._id.action), r.count));

      const list = Array.from(map.values()).sort((a, b) => b.total - a.total);
      const names = await resolveUserNames(guardClient, list.map((m) => m.moderatorId));

      res.json({
        periodDays: days,
        moderators: list.map((m) => ({ ...m, user: names[m.moderatorId] || null })),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/guilds/:guildId/moderators/:userId', async (req, res) => {
    try {
      const { guildId, userId } = req.params;
      const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

      const [moderatorActions, punishments] = await Promise.all([
        ModeratorActions.find({ guildId, moderatorId: userId, createdAt: { $gte: since } })
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean(),
        Punishment.find({ guildId, staffId: userId, date: { $gte: since } })
          .sort({ date: -1 })
          .limit(limit)
          .lean(),
      ]);

      const records = [
        ...moderatorActions.map((a) => ({
          source: 'moderatorAction',
          action: a.action,
          targetId: a.targetId,
          reason: a.reason,
          date: a.createdAt,
        })),
        ...punishments.map((p) => ({
          source: 'punishment',
          action: normalizePunishmentType(p.type),
          type: p.type,
          targetId: p.userId,
          reason: p.reason,
          date: p.date,
          active: p.active,
          deleted: p.deleted,
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

      const counts = {};
      let total = 0;
      records.forEach((r) => {
        counts[r.action] = (counts[r.action] || 0) + 1;
        total += 1;
      });

      const names = await resolveUserNames(guardClient, [userId]);
      res.json({
        periodDays: days,
        moderatorId: userId,
        user: names[userId] || null,
        total,
        counts,
        records,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


  router.get('/guilds/:guildId/action-limits', async (req, res) => {
    try {
      const { guildId } = req.params;
      const limits = await ActionLimits.find({ guildId }).lean();
      res.json(limits);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

 
  router.get('/guilds/:guildId/backups', async (req, res) => {
    try {
      const { guildId } = req.params;
      const backups = await BackupData.find({ guildId })
        .sort({ backupDate: -1 })
        .limit(20)
        .select('backupDate guild.name roles channels emojis bans')
        .lean();

      res.json(
        backups.map((b) => ({
          id: b._id,
          backupDate: b.backupDate,
          guildName: b.guild?.name ?? null,
          roles: b.roles?.length ?? 0,
          channels: b.channels?.length ?? 0,
          emojis: b.emojis?.length ?? 0,
          bans: b.bans?.length ?? 0,
        }))
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/guilds/:guildId/backups/:backupId', async (req, res) => {
    try {
      const { guildId, backupId } = req.params;
      const result = await BackupData.deleteOne({ _id: backupId, guildId });
      if (!result.deletedCount) {
        return res.status(404).json({ error: 'Yedek bulunamadı' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  
  router.get('/guilds/:guildId/command-permissions', async (req, res) => {
    try {
      const { guildId } = req.params;
      const commands = buildGuardCommandList(guardClient);
      const names = commands.map((c) => c.name);
      const docs = await GuardCommandSettings.find({ guildId, commandName: { $in: names } }).lean();
      const map = new Map(docs.map((d) => [d.commandName, d]));

      res.json(
        commands.map((meta) => ({
          ...meta,
          settings: map.get(meta.name) ?? defaultCommandSettings(guildId, meta),
        }))
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/guilds/:guildId/command-permissions/:commandName', async (req, res) => {
    try {
      const { guildId, commandName } = req.params;
      const meta = buildGuardCommandList(guardClient).find((c) => c.name === commandName);
      if (!meta) return res.status(404).json({ error: 'Komut bulunamadı' });

      const doc = await GuardCommandSettings.findOne({ guildId, commandName }).lean();
      res.json({
        ...meta,
        settings: doc ?? defaultCommandSettings(guildId, meta),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/guilds/:guildId/command-permissions/:commandName', async (req, res) => {
    try {
      const { guildId, commandName } = req.params;
      const meta = buildGuardCommandList(guardClient).find((c) => c.name === commandName);
      if (!meta) return res.status(404).json({ error: 'Komut bulunamadı' });

      const update = {};
      for (const key of COMMAND_SETTING_FIELDS) {
        if (req.body[key] !== undefined) update[key] = req.body[key];
      }
      update.updatedAt = new Date();

      const settings = await GuardCommandSettings.findOneAndUpdate(
        { guildId, commandName },
        { $set: update, $setOnInsert: { guildId, commandName } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({ success: true, settings });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/guilds/:guildId/command-permissions/:commandName', async (req, res) => {
    try {
      const { guildId, commandName } = req.params;
      await GuardCommandSettings.deleteOne({ guildId, commandName });
      res.json({ success: true, message: 'Komut yetkileri sıfırlandı' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
