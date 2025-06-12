import { Events, AuditLogEvent } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.ChannelDelete,
  async execute(client, channel) {
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 });
    const entry = logs.entries.first();
    const executor = entry?.executor;

    const logger = new modLogger(client);
    await logger.logEvent({
      guild: channel.guild,
      author: { name: channel.guild.name, iconURL: channel.guild.iconURL() },
      type: 'channel',
	  color: 0xFF0000,
      title: null,
      description: `\`${channel.name}\` kanalı ${executor ? `<@${executor.id}> tarafından` : ''} silindi.`,
      footer: { text: executor?.tag || 'Bilinmiyor', iconURL: executor?.displayAvatarURL() }
    });
  }
};
