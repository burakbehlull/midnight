import { Events, AuditLogEvent } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.GuildBanRemove,
  async execute(client, ban) {
	  
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 });
    const entry = logs.entries.first();
    const executor = entry?.executor;

    const logger = new modLogger(client);
    await logger.logEvent({
      guild: ban.guild,
      author: { name: ban.guild.name, iconURL: ban.guild.iconURL() },
      type: 'kickBan',
	  color: 0x808080,
      title: null,
      description: `<@${ban.user.id}> kullanıcısının yasağı ${executor ? `<@${executor.id}> tarafından` : ''} kaldırıldı.`,
      footer: { text: ban.user.tag, iconURL: ban.user.displayAvatarURL() }
    });
	
  }
};
