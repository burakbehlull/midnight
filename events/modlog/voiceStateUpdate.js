import { Events, AuditLogEvent } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
	  
    const logger = new modLogger(client);
    const member = newState.member;
    const guild = newState.guild;
	const user = newState.member.user;

    if (member.user.bot) return;

    if (!oldState.channel && newState.channel) {
      await logger.logEvent({
        guild: newState.guild,
        type: 'voice',
		color: '#2a96f5',
        title: null,
        author: { name: guild.name, iconURL: guild.iconURL() },
		description: `<@${member.id}> adlı kullanıcı <#${newState.channel.id}> kanalına katıldı.`,
		footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
      });
    } else if (oldState.channel && !newState.channel) {
      await logger.logEvent({
        guild: oldState.guild,
		type: 'voice',
		color: '#f52a2a',
        title: null,
        author: { name: guild.name, iconURL: guild.iconURL() },
		description: `<@${member.id}> adlı kullanıcı <#${oldState.channel.id}> kanalından ayrıldı.`,
		footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
      });
    }
	
	
	
	// (mute)
    if (!oldState.serverMute && newState.serverMute) {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 });
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

    // Susturma kaldırma
    if (oldState.serverMute && !newState.serverMute) {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 });
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
	
  }
};
