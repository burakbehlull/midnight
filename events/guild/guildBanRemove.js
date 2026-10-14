import { Events, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { ForceBan } from '#models';

export default {
  name: Events.GuildBanRemove,
  async execute(client, ban) {
    try {
      const guild = ban.guild;
      const user = ban.user;

      if (!guild || !user) return;

      const forceBanRecord = await ForceBan.findOne({ 
        userId: user.id, 
        guildId: guild.id 
      });

      if (!forceBanRecord) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanRemove,
        limit: 5,
      }).catch(() => null);

      if (!auditLogs) {
        console.log('[guildBanRemove] Audit log alınamadı');
        return;
      }

      const relevantLog = auditLogs.entries.find(entry => 
        entry.target.id === user.id && 
        (Date.now() - entry.createdTimestamp) < 5000
      );

      if (!relevantLog) {
        console.log('[guildBanRemove] İlgili audit log bulunamadı');
        return;
      }

      const executor = relevantLog.executor;

      if (!executor || executor.bot) {
        console.log('[guildBanRemove] Executor bot veya yok, işlem yapılmıyor');
        await ForceBan.deleteOne({ userId: user.id, guildId: guild.id });
        return;
      }

      if (executor.id === forceBanRecord.bannedBy) {
        console.log(`[guildBanRemove] Ban açan kişi banlayan kişi: ${executor.tag}`);
        await ForceBan.deleteOne({ userId: user.id, guildId: guild.id });
        return;
      }

      if (executor.id === guild.ownerId) {
        console.log(`[guildBanRemove] Sunucu sahibi banı açtı: ${executor.tag}`);
        await ForceBan.deleteOne({ userId: user.id, guildId: guild.id });
        return;
      }

      console.log(`[guildBanRemove] ⚠️ Yetkisiz ban açma tespit edildi! Executor: ${executor.tag} (${executor.id})`);

      const member = await guild.members.fetch(executor.id).catch(() => null);
      
      if (!member) {
        console.log('[guildBanRemove] Member fetch edilemedi');
        await ForceBan.deleteOne({ userId: user.id, guildId: guild.id });
        return;
      }

      const rolesToRemove = member.roles.cache.filter(role => 
        role.permissions.has(PermissionFlagsBits.BanMembers) ||
        role.permissions.has(PermissionFlagsBits.Administrator) ||
        role.permissions.has(PermissionFlagsBits.ManageGuild) ||
        role.permissions.has(PermissionFlagsBits.KickMembers)
      );

      if (rolesToRemove.size === 0) {
        console.log('[guildBanRemove] Silinecek yetki rolü yok');
        await ForceBan.deleteOne({ userId: user.id, guildId: guild.id });
        return;
      }

      const roleNames = rolesToRemove.map(r => r.name).join(', ');
      
      try {
        await member.roles.remove(rolesToRemove, 
          `[FORCEBAN GÜVENLİK] Yetkisiz forceban açma girişimi - Ban açılan: ${user.tag}`
        );
        
        console.log(`[guildBanRemove] ✅ ${executor.tag} kullanıcısının ${rolesToRemove.size} yetkili rolü silindi: ${roleNames}`);

        try {
          await member.send(
            `**⚠️ Yetki Rollerin Kaldırıldı**\n\n` +
            `**Sunucu:** ${guild.name}\n\n` +
            `**Sebep:** Sadece banlayan kişinin açabileceği bir forceban'ı yetkisiz şekilde açmaya çalıştın.\n\n` +
            `**Kaldırılan Roller:** ${roleNames}\n\n` +
            `**Açılan Kullanıcı:** ${user.tag} (\`${user.id}\`)\n\n` +
            `Bu kullanıcıyı <@${forceBanRecord.bannedBy}> forceban'lamıştı. Sadece o kişi veya sunucu sahibi açabilir.\n\n` +
            `Eğer bu bir hata olduğunu düşünüyorsan sunucu yetkilileriyle iletişime geç.`
          ).catch(() => {
            console.log(`[guildBanRemove] ${executor.tag} kullanıcısına DM gönderilemedi`);
          });
        } catch {}

        await ForceBan.deleteOne({ userId: user.id, guildId: guild.id });

      } catch (err) {
        console.error('[guildBanRemove] Rol kaldırma hatası:', err);
      }

    } catch (error) {
      console.error('[guildBanRemove] Event hatası:', error);
    }
  },
};
