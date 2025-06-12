import { Events, AuditLogEvent } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.GuildBanAdd,
  async execute(client, ban) {
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
    const entry = logs.entries.first();
    const executor = entry?.executor;

    const logger = new modLogger(client);
    await logger.logEvent({
      guild: ban.guild,
      author: { name: ban.guild.name, iconURL: ban.guild.iconURL() },
      type: 'kickBan',
	  color: 0xFF0000,
      title: null,
      description: `<@${ban.user.id}> kullanıcısı ${executor ? `<@${executor.id}> tarafından` : ''} yasaklandı.`,
      footer: { text: ban.user.tag, iconURL: ban.user.displayAvatarURL() }
    });
  }
};
