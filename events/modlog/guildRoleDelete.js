import { Events, AuditLogEvent } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.GuildRoleDelete,
  async execute(client, role) {
    const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 });
    const entry = logs.entries.first();
    if (!entry || entry.target.id !== role.id) return;

    const executor = entry.executor;
    const logger = new modLogger(client);
    await logger.logEvent({
      guild: role.guild,
      author: { name: role.guild.name, iconURL: role.guild.iconURL() },
      type: 'role',
      title: null,
	  color: 0xFF0000,
	  description: `
		**Role Adı**: ${role.name} \` ${role.id} \`
		**Silen**: ${executor ? `<@${executor.id}> tarafından` : ''} \` ${executor?.id} \`
	  `,
      footer: { text: executor?.tag || 'Bilinmiyor', iconURL: executor?.displayAvatarURL() }
    });
  }
};
