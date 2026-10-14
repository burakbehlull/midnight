import { Events, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    try {
      if (!member.guild) return;

      const logger = new modLogger(client);
    
      await logger.logEvent({
        guild: member.guild,
        author: { name: member.guild.name, iconURL: member.guild.iconURL() },
        type: 'joinLeave',
        title: null,
        color: 0xFF0000,
        description: `<@${member.id}> adlı kullanıcı sunucudan çıkış yaptı!`,
        footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
      });
    
      const botMember = member.guild.members.cache.get(client.user.id);
      if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        return;
      }
      
      const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 }).catch(() => null);
      if (!logs) return;
      
      const entry = logs.entries.find(e =>
        e.target.id === member.id &&
        Date.now() - e.createdTimestamp < 5000
      );

      if (entry) {
        const executor = entry.executor;
        const reason = entry.reason || 'Sebep belirtilmedi.';

        await logger.logEvent({
          guild: member.guild,
          author: { name: member.guild.name, iconURL: member.guild.iconURL() },
          type: 'kickBan',
          title: null,
          description: `<@${member.id}> adlı kullanıcı, <@${executor.id}> tarafından sunucudan kicklendi.\n**Sebep:** ${reason}`,
          footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
        });
      }
    } catch (error) {
      if (error.code === 50013 || error.code === 10004) return;
      console.error('[guildMemberRemove] Hata:', error.message);
    }
  }
};
