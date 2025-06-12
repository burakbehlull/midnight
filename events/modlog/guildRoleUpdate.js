import { Events, AuditLogEvent, PermissionsBitField } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.GuildRoleUpdate,
  async execute(client, oldRole, newRole) {
    if (
      oldRole.name === newRole.name &&
      oldRole.permissions.bitfield === newRole.permissions.bitfield &&
      oldRole.color === newRole.color &&
      oldRole.hoist === newRole.hoist &&
      oldRole.mentionable === newRole.mentionable
    ) return;

    const logs = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 1 });
    const entry = logs.entries.first();
    if (!entry || entry.target.id !== newRole.id) return;

    const executor = entry.executor;

    const changes = [];

    if (oldRole.name !== newRole.name) {
      changes.push(`**İsim:** \`${oldRole.name}\` ➜ \`${newRole.name}\``);
    }

    if (oldRole.color !== newRole.color) {
      changes.push(`**Renk:** \`${oldRole.color.toString(16)}\` ➜ \`${newRole.color.toString(16)}\``);
    }

    if (oldRole.hoist !== newRole.hoist) {
      changes.push(`**Ayrı Göster:** \`${oldRole.hoist}\` ➜ \`${newRole.hoist}\``);
    }

    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push(`**Etiketlenebilir:** \`${oldRole.mentionable}\` ➜ \`${newRole.mentionable}\``);
    }

    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      const oldPerms = new PermissionsBitField(oldRole.permissions.bitfield).toArray();
      const newPerms = new PermissionsBitField(newRole.permissions.bitfield).toArray();

      const added = newPerms.filter(p => !oldPerms.includes(p));
      const removed = oldPerms.filter(p => !newPerms.includes(p));

      if (added.length > 0) changes.push(`**Eklenen Yetkiler:** \`${added.join(', ')}\``);
      if (removed.length > 0) changes.push(`**Kaldırılan Yetkiler:** \`${removed.join(', ')}\``);
    }

    const logger = new modLogger(client);
    await logger.logEvent({
      guild: newRole.guild,
      author: { name: newRole.guild.name, iconURL: newRole.guild.iconURL() },
      type: 'role',
      title: null,
	  color: 0xFFFF00,
      description: `
		**Rol:** <@&${newRole.id}> (\`${newRole.id}\`)
		**Güncelleyen:** ${executor ? `<@${executor.id}>` : 'Bilinmiyor'} (\`${executor?.id || 'N/A'}\`)

		${changes.join('\n')}
      `,
      footer: { text: executor?.tag || 'Bilinmiyor', iconURL: executor?.displayAvatarURL() }
    });
  }
};
