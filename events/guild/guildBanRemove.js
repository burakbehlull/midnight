import { Events, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { ForceBan, Punishment } from '#models';
import { modLogger } from '#helpers';

const GUARD_TYPES = {
  forceban: { label: 'FORCE BAN', tag: '[FORCE BAN]' },
  godban: { label: 'GOD BAN', tag: '[GOD BAN]' },
};

export default {
  name: Events.GuildBanRemove,
  async execute(client, ban) {
    try {
      const guild = ban.guild;
      const user = ban.user;

      if (!guild || !user) return;

      const record = await ForceBan.findOne({ userId: user.id, guildId: guild.id });
      if (!record) return;

      const guard = GUARD_TYPES[record.banType];
      if (!guard) return;

      await new Promise(resolve => setTimeout(resolve, 1000));

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanRemove,
        limit: 5,
      }).catch(() => null);

      if (!auditLogs) {
        console.log('[guildBanRemove] Audit log alınamadı, kayıt korunuyor');
        return;
      }

      const relevantLog = auditLogs.entries.find(entry =>
        entry.target?.id === user.id &&
        (Date.now() - entry.createdTimestamp) < 5000
      );

      if (!relevantLog) {
        console.log('[guildBanRemove] İlgili audit log bulunamadı, kayıt korunuyor');
        return;
      }

      const executor = relevantLog.executor;

      if (!executor || executor.bot) {
        console.log('[guildBanRemove] Açan bot veya bulunamadı, kayıt korunuyor');
        return;
      }

      if (executor.id === record.bannedBy || executor.id === guild.ownerId) {
        console.log(`[guildBanRemove] İzinli ban açma: ${executor.tag}`);
        await ForceBan.deleteOne({ userId: user.id, guildId: guild.id });
        return;
      }

      console.log(`[guildBanRemove] ⚠️ Yetkisiz ${guard.label} açma tespit edildi! Executor: ${executor.tag} (${executor.id})`);

      const member = await guild.members.fetch(executor.id).catch(() => null);
      let removedRoleNames = [];

      if (member) {
        const rolesToRemove = member.roles.cache.filter(role =>
          !role.managed &&
          role.id !== guild.id &&
          (role.permissions.has(PermissionFlagsBits.BanMembers) ||
            role.permissions.has(PermissionFlagsBits.Administrator) ||
            role.permissions.has(PermissionFlagsBits.ManageGuild) ||
            role.permissions.has(PermissionFlagsBits.KickMembers))
        );

        if (rolesToRemove.size > 0) {
          removedRoleNames = rolesToRemove.map(r => r.name);
          await member.roles.remove(
            rolesToRemove,
            `[BAN GUARD] Yetkisiz ${guard.label} açma girişimi - Açılan: ${user.tag}`
          ).catch(err => console.error('[guildBanRemove] Rol kaldırma hatası:', err));
          console.log(`[guildBanRemove] ${executor.tag} yetkili rolleri silindi: ${removedRoleNames.join(', ')}`);
        }
      }

      let executorBanned = false;
      try {
        await guild.bans.create(executor.id, {
          reason: `[BAN GUARD] Yetkisiz ${guard.label} açma girişimi | Açılan: ${user.tag} (${user.id})`,
        });
        executorBanned = true;

        try {
          await Punishment.create({
            userId: executor.id,
            guildId: guild.id,
            staffId: client.user.id,
            type: 'ban',
            duration: null,
            reason: `[BAN GUARD] Yetkisiz ${guard.label} açma girişimi`,
          });
        } catch (err) {
          console.error('[guildBanRemove] Açan için Punishment kaydedilemedi:', err);
        }
      } catch (err) {
        console.error('[guildBanRemove] Açan kişi banlanamadı:', err?.message || String(err));
      }

      let rebanned = false;
      try {
        await guild.bans.create(user.id, {
          deleteMessageSeconds: 7 * 24 * 60 * 60,
          reason: `${guard.tag} Yetkisiz açma sonrası yeniden ban | Açan: ${executor.tag} (${executor.id})`,
        });
        rebanned = true;
      } catch (err) {
        console.error('[guildBanRemove] Yeniden ban başarısız:', err?.message || String(err));
      }

      await ForceBan.updateOne(
        { userId: user.id, guildId: guild.id },
        {
          $inc: { guardAttempts: 1 },
          $set: {
            lastGuardAt: new Date(),
            lastGuardBy: executor.id,
            ...(rebanned ? { bannedAt: new Date() } : {}),
          },
        }
      ).catch(err => console.error('[guildBanRemove] ForceBan güncellenemedi:', err));

      if (member) {
        member.send(
          `**⚠️ Yetkisiz Ban Açma Tespit Edildi**\n\n` +
          `**Sunucu:** ${guild.name}\n` +
          `**Sebep:** Sadece banlayan kişinin açabileceği bir ${guard.label} banını yetkisiz şekilde açtın.\n\n` +
          `**Kaldırılan Roller:** ${removedRoleNames.length ? removedRoleNames.join(', ') : 'Yok'}\n` +
          `**Açılan Kullanıcı:** ${user.tag} (\`${user.id}\`)\n` +
          `**Sonuç:** ${executorBanned ? 'Banlandın' : 'Banlanamadın (rol hiyerarşisi)'} • Kullanıcı ${rebanned ? 'yeniden banlandı' : 'yeniden banlanamadı'}\n\n` +
          `Bu kullanıcıyı <@${record.bannedBy}> ${guard.label} ile banlamıştı. Sadece o kişi veya sunucu sahibi açabilir.`
        ).catch(() => console.log(`[guildBanRemove] ${executor.tag} kullanıcısına DM gönderilemedi`));
      }

      try {
        const logger = new modLogger(client);
        await logger.logEvent({
          guild,
          author: { name: guild.name, iconURL: guild.iconURL() },
          type: 'kickBan',
          color: 0xd97706,
          title: `⚠️ Yetkisiz ${guard.label} Açma Girişimi`,
          description:
            `**Açan:** <@${executor.id}> \`${executor.tag}\`\n` +
            `**Açılan Kullanıcı:** <@${user.id}> \`${user.tag}\`\n` +
            `**Banlayan:** <@${record.bannedBy}>\n\n` +
            `**Kaldırılan Roller:** ${removedRoleNames.length ? removedRoleNames.join(', ') : 'Yok'}\n` +
            `**Açan Banlandı:** ${executorBanned ? 'Evet' : 'Hayır'}\n` +
            `**Kullanıcı Yeniden Banlandı:** ${rebanned ? 'Evet' : 'Hayır'}`,
          footer: { text: `Ban Guard • ${guard.label}`, iconURL: guild.iconURL() },
        });
      } catch (err) {
        console.error('[guildBanRemove] Mod-log gönderilemedi:', err);
      }

    } catch (error) {
      console.error('[guildBanRemove] Event hatası:', error);
    }
  },
};
