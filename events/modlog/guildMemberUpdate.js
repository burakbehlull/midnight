import { Events, AuditLogEvent } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.GuildMemberUpdate,
  
  async execute(client, oldMember, newMember) {
    if (!newMember.guild) return;

    const logger = new modLogger(client);
    const guild = newMember.guild;
    const now = Date.now();

    // TIMEOUT (Ekleme / Kaldırma)
    const wasTimedOut = !!oldMember.communicationDisabledUntil;
    const isTimedOut = !!newMember.communicationDisabledUntil;

    if (!wasTimedOut && isTimedOut) {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 });
      const entry = logs.entries.find(e =>
        e.target.id === newMember.id &&
        e.changes?.some(change => change.key === 'communication_disabled_until' && change.new !== null)
      );
      const executor = entry?.executor;

      await logger.logEvent({
        guild,
        author: { name: guild.name, iconURL: guild.iconURL() },
        type: 'moderation',
		color: 0x808080,
        title: null,
        description: `<@${newMember.id}> adlı kullanıcı ${executor ? `<@${executor.id}> tarafından` : ''} <t:${Math.floor(new Date(newMember.communicationDisabledUntil).getTime() / 1000)}:R> zamana kadar timeout yedi.`,
        footer: { text: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() }
      });
    }

    if (wasTimedOut && !isTimedOut) {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 });
      const entry = logs.entries.find(e =>
        e.target.id === newMember.id &&
        e.changes?.some(change => change.key === 'communication_disabled_until' && change.new === null)
      );
      const executor = entry?.executor;

      await logger.logEvent({
        guild,
        author: { name: guild.name, iconURL: guild.iconURL() },
        type: 'moderation',
		color: 0xFF0000,
        title: null,
        description: `<@${newMember.id}> adlı kullanıcının timeout'u ${executor ? `<@${executor.id}> tarafından` : ''} kaldırıldı.`,
        footer: { text: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() }
      });
    }

    // NICKNAME DEĞİŞİMİ
    const oldNick = oldMember.nickname;
    const newNick = newMember.nickname;

    if (oldNick !== newNick) {
      const logs = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 });

      const entry = logs.entries.find(
        e =>
          e.target.id === newMember.id &&
          now - e.createdTimestamp < 5000 &&
          e.changes.some(change => change.key === 'nick')
      );

      const executor = entry?.executor;

      await logger.logEvent({
        guild: newMember.guild,
        author: { name: newMember.guild.name, iconURL: newMember.guild.iconURL() },
        type: 'moderation',
        title: null,
		color: '#6A9BD8',
        description: `
          <@${newMember.id}> kullanıcısının takma adı ${executor ? `<@${executor.id}> tarafından` : ''} değiştirildi.
          **Eski:** \`${oldNick || 'Yok'}\`
          **Yeni:** \`${newNick || 'Yok'}\`
        `,
        footer: { text: executor?.tag || 'Bilinmiyor', iconURL: executor?.displayAvatarURL() }
      });
    }


    // ROLE EKLEME / KALDIRMA
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());

    const addedRoles = [...newRoles].filter(r => !oldRoles.has(r));
    const removedRoles = [...oldRoles].filter(r => !newRoles.has(r));

    if (addedRoles.length > 0 || removedRoles.length > 0) {
      const urlogs = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 5 });

      for (const roleId of addedRoles) {
        const role = newMember.guild.roles.cache.get(roleId);
        if (!role) continue;

        const entry = urlogs.entries.find(
          e => e.target.id === newMember.id &&
          now - e.createdTimestamp < 5000 &&
          e.changes.some(change => change.key === '$add')
        );

        await logger.logEvent({
          guild: newMember.guild,
          author: { name: newMember.guild.name, iconURL: newMember.guild.iconURL() },
          type: 'role',
		  color: 0x808080,
          title: null,
          description: `<@${newMember.id}> kullanıcısına ${entry?.executor ? `<@${entry.executor.id}> tarafından` : ''} <@&${role.id}> rolü verildi.`,
          footer: { text: entry?.executor?.tag || 'Bilinmiyor', iconURL: entry?.executor?.displayAvatarURL() }
        });
      }

      for (const roleId of removedRoles) {
        const role = oldMember.guild.roles.cache.get(roleId);
        if (!role) continue;

        const entry = urlogs.entries.find(
          e => e.target.id === newMember.id &&
          now - e.createdTimestamp < 5000 &&
          e.changes.some(change => change.key === '$remove')
        );

        await logger.logEvent({
          guild: newMember.guild,
          author: { name: newMember.guild.name, iconURL: newMember.guild.iconURL() },
          type: 'role',
		  color: 0xFF0000,
          title: null,
          description: `<@${newMember.id}> kullanıcısından <@&${role.id}> rolü ${entry?.executor ? `tarafından <@${entry.executor.id}>` : ''} alındı.`,
          footer: { text: entry?.executor?.tag || 'Bilinmiyor', iconURL: entry?.executor?.displayAvatarURL() }
        });
      }
    }
  }
};
