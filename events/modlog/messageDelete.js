import { Events, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { modLogger, fetchPartialNeed } from '#helpers';

// Aynı kanaldaki ardışık silmelerde (örn. .clear) audit log API'sini boğmamak için kısa ömürlü önbellek
const deleteAuditCache = new Map();

async function fetchRecentDeleteEntries(guild, channelId) {
  const cached = deleteAuditCache.get(channelId);
  if (cached && Date.now() - cached.at < 2000) return cached.entries;

  const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 5 }).catch(() => null);
  const entries = logs ? [...logs.entries.values()] : [];
  deleteAuditCache.set(channelId, { at: Date.now(), entries });
  return entries;
}

async function resolveDeleter(client, guild, message) {
  const botMember = guild.members.cache.get(client.user.id);
  if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ViewAuditLog)) return null;

  const entries = await fetchRecentDeleteEntries(guild, message.channel.id);
  const entry = entries.find(e =>
    Date.now() - e.createdTimestamp < 5000 &&
    e.extra?.channel?.id === message.channel.id &&
    e.target?.id === message.author.id
  );

  const executor = entry?.executor;
  if (!executor || executor.id === message.author.id) return null;

  const isSelf = executor.id === client.user.id;
  return `**Silen**: <@${executor.id}>${isSelf ? ' (Bot / Komut)' : ''}`;
}

export default {
  name: Events.MessageDelete,
  async execute(client, message) {
    try {
      message = await fetchPartialNeed(message);

      if (!message?.author || message.author.bot) return;
      
      if (!message.guild) return;

      const logger = new modLogger(client);
      const guild = message.guild;

      const content = message.content?.trim() || null;
      const attachmentInfo = message.attachments.size > 0
        ? `**Ekler**: ${[...message.attachments.values()].map(a => a.url).join("\n")}`
        : '';

      const deleterText = await resolveDeleter(client, guild, message);

      const description = [
        `**Kişi**: <@${message.author.id}>`,
        `**Kanal**: <#${message.channel.id}>`,
        deleterText,
        `**Silinen Mesaj**: ${content ? `\`${content}\`` : "*Boş içerik veya sadece embed vardı*"}`,
        attachmentInfo
      ].filter(Boolean).join('\n');

      await logger.logEvent({
        guild,
        type: 'message',
        color: '#d90f0f',
        title: 'Mesaj Silindi',
        author: {
          name: guild?.name ?? "Sunucu",
          iconURL: guild?.iconURL() ?? null
        },
        footer: {
          text: message.author.tag,
          iconURL: message.author.displayAvatarURL()
        },
        description
      });
    } catch (err) {
      console.error('[modlog/messageDelete] Hata:', err?.message || err);
    }
  }
};
