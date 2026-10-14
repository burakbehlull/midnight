import { Events, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.GuildRoleCreate,
  async execute(client, role) {
    try {
      if (!role.guild) return;

      const botMember = role.guild.members.cache.get(client.user.id);
      if (!botMember) return;

      if (!botMember.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        return;
      }

      const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 }).catch(() => null);
      if (!logs) return;

      const entry = logs.entries.first();
      if (!entry || entry.target.id !== role.id) return;

      const executor = entry.executor;
      const logger = new modLogger(client);
      await logger.logEvent({
        guild: role.guild,
        author: { name: role.guild.name, iconURL: role.guild.iconURL() },
        type: 'role',
        title: null,
        color: '#9AD0EC',
        description: `
          **Role Adı**: <@${role.id}> \` ${role.id} \`
          **Oluşturan**: ${executor ? `<@${executor.id}> tarafından` : ''} \` ${executor?.id} \`
        `,
        footer: { text: executor?.tag || 'Bilinmiyor', iconURL: executor?.displayAvatarURL() }
      });
    } catch (error) {
      console.error('[guildRoleCreate] Hata:', error.message);
    }
  }
};
