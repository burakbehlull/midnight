import { Events, AuditLogEvent, PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#helpers';
import { VoiceSession } from '#models';

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    return `${days} gün ${remainingHours} saat ${remainingMinutes} dakika`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours} saat ${remainingMinutes} dakika`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes} dakika ${remainingSeconds} saniye`;
  } else {
    return `${seconds} saniye`;
  }
}

function getUsersInChannel(channel) {
  if (!channel || !channel.members) return [];
  
  const users = [];
  channel.members.forEach(member => {
    if (member.user.bot) return;
    const globalName = member.user.globalName || member.user.username;
    const username = member.user.username;
    const userId = member.user.id;
    users.push(`${globalName} (${username} - ${userId})`);
  });
  
  return users;
}

export default {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    try {
      const logger = new modLogger(client);
      const member = newState.member;
      const guild = newState.guild;
      const user = newState.member.user;

      if (member.user.bot) return;

      if (!oldState.channel && newState.channel) {
        await VoiceSession.findOneAndUpdate(
          { userId: user.id, guildId: guild.id },
          {
            userId: user.id,
            guildId: guild.id,
            channelId: newState.channel.id,
            joinedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        const usersInChannel = getUsersInChannel(newState.channel);
        const userListText = usersInChannel.length > 0 
          ? `\n\n**Seste Olan Kullanıcılar (${usersInChannel.length}):**\n${usersInChannel.map((u, i) => `${i + 1}. ${u}`).join('\n')}`
          : '\n\n**Seste başka kullanıcı yok.**';

        await logger.logEvent({
          guild: newState.guild,
          type: 'voice',
          color: '#2a96f5',
          title: null,
          author: { name: guild.name, iconURL: guild.iconURL() },
          description: `<@${member.id}> adlı kullanıcı <#${newState.channel.id}> kanalına katıldı.${userListText}`,
          footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
        });
      } else if (oldState.channel && !newState.channel) {
        const session = await VoiceSession.findOneAndDelete({
          userId: user.id,
          guildId: guild.id
        });

        let durationText = '';
        let timeAgoText = '';
        
        if (session) {
          const duration = Date.now() - session.joinedAt.getTime();
          durationText = `\n**Seste Kalma Süresi:** ${formatDuration(duration)}`;
          
          const joinTimestamp = Math.floor(session.joinedAt.getTime() / 1000);
          timeAgoText = `\n**Ayrılma Zamanı:** <t:${Math.floor(Date.now() / 1000)}:R>`;
        }

        const usersInChannel = getUsersInChannel(oldState.channel);
        const userListText = usersInChannel.length > 0 
          ? `\n\n**Seste Kalan Kullanıcılar (${usersInChannel.length}):**\n${usersInChannel.map((u, i) => `${i + 1}. ${u}`).join('\n')}`
          : '\n\n**Seste başka kullanıcı kalmadı.**';

        await logger.logEvent({
          guild: oldState.guild,
          type: 'voice',
          color: '#f52a2a',
          title: null,
          author: { name: guild.name, iconURL: guild.iconURL() },
          description: `<@${member.id}> adlı kullanıcı <#${oldState.channel.id}> kanalından ayrıldı.${durationText}${timeAgoText}${userListText}`,
          footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
        });
      }

      const botMember = guild.members.cache.get(client.user.id);
      if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        return;
      }

      if (!oldState.serverMute && newState.serverMute) {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 }).catch(() => null);
        if (!logs) return;
        
        const entry = logs.entries.find(e =>
          e.target.id === member.id &&
          e.changes?.some(change => change.key === 'mute' && change.new === true)
        );
        const executor = entry?.executor;

        await logger.logEvent({
          guild,
          author: { name: guild.name, iconURL: guild.iconURL() },
          type: 'moderation',
          color: '#de1616',
          title: null,
          description: `<@${user.id}> adlı kullanıcı <#${newState.channelId}> kanalında ${executor ? `<@${executor.id}> tarafından` : ''} susturuldu.`,
          footer: { text: user.tag, iconURL: user.displayAvatarURL() }
        });
      }

      if (oldState.serverMute && !newState.serverMute) {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 }).catch(() => null);
        if (!logs) return;
        
        const entry = logs.entries.find(e =>
          e.target.id === member.id &&
          e.changes?.some(change => change.key === 'mute' && change.new === false)
        );
        const executor = entry?.executor;

        await logger.logEvent({
          guild,
          author: { name: guild.name, iconURL: guild.iconURL() },
          type: 'moderation',
          color: '#de1616',
          title: null,
          description: `<@${user.id}> adlı kullanıcının <#${newState.channelId}> kanalındaki susturulması ${executor ? `<@${executor.id}> tarafından` : ''} kaldırıldı.`,
          footer: { text: user.tag, iconURL: user.displayAvatarURL() }
        });
      }
    } catch (error) {
      if (error.code === 50013 || error.code === 10004) return;
      console.error('[voiceStateUpdate] Hata:', error.message);
    }
  }
};
