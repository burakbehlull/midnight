import { Events, AuditLogEvent, ChannelType } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.ChannelUpdate,
  async execute(client, oldChannel, newChannel) {
    if (!newChannel.guild) return;

    const logs = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 1 });
    const entry = logs.entries.first();
    if (!entry || entry.target.id !== newChannel.id) return;

    const executor = entry.executor;
    const changes = [];

    if (oldChannel.name !== newChannel.name) {
      changes.push(`**İsim:** \`${oldChannel.name}\` ➜ \`${newChannel.name}\``);
    }

    if (oldChannel.type !== newChannel.type) {
      changes.push(`**Tür:** \`${ChannelType[oldChannel.type]}\` ➜ \`${ChannelType[newChannel.type]}\``);
    }

    if ('nsfw' in oldChannel && oldChannel.nsfw !== newChannel.nsfw) {
      changes.push(`**NSFW:** \`${oldChannel.nsfw}\` ➜ \`${newChannel.nsfw}\``);
    }

    if ('rateLimitPerUser' in oldChannel && oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      changes.push(`**Yavaş Mod:** \`${oldChannel.rateLimitPerUser}s\` ➜ \`${newChannel.rateLimitPerUser}s\``);
    }

    if ('parentId' in oldChannel && oldChannel.parentId !== newChannel.parentId) {
      const oldParent = oldChannel.parent?.name || 'Yok';
      const newParent = newChannel.parent?.name || 'Yok';
      changes.push(`**Kategori:** \`${oldParent}\` ➜ \`${newParent}\``);
    }

    if ('topic' in oldChannel && oldChannel.topic !== newChannel.topic) {
      const oldTopic = oldChannel.topic || 'Yok';
      const newTopic = newChannel.topic || 'Yok';
      changes.push(`**Konu:** \`${oldTopic}\` ➜ \`${newTopic}\``);
    }

    if (changes.length === 0) return; // Hiçbir anlamlı değişiklik yoksa log basma

    const logger = new modLogger(client);
    await logger.logEvent({
      guild: newChannel.guild,
      author: { name: newChannel.guild.name, iconURL: newChannel.guild.iconURL() },
      type: 'channel',
      title: null,
	  color: 0xFFFF00,
      description: `
		**Kanal:** <#${newChannel.id}> (\`${newChannel.id}\`)
		**Güncelleyen:** ${executor ? `<@${executor.id}>` : 'Bilinmiyor'} (\`${executor?.id || 'N/A'}\`)

		${changes.join('\n')}
      `,
      footer: { text: executor?.tag || 'Bilinmiyor', iconURL: executor?.displayAvatarURL() }
    });
  }
};
