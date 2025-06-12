import { Events, AuditLogEvent } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.ChannelCreate,
  async execute(client, channel) {
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 });
    const entry = logs.entries.first();
    const executor = entry?.executor;

    const logger = new modLogger(client);
    await logger.logEvent({
      guild: channel.guild,
      author: { name: channel.guild.name, iconURL: channel.guild.iconURL() },
      type: 'channel',
	  color: '#9AD0EC',
      title: null,
      description: `<#${channel.id}> kanalı ${executor ? `<@${executor.id}> tarafından` : ''} oluşturuldu.`,
      footer: { text: executor?.tag || 'Bilinmiyor', iconURL: executor?.displayAvatarURL() }
    });
  }
};
