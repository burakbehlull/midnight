import { Events } from 'discord.js';
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
        title: null,
        author: { name: guild.name, iconURL: guild.iconURL() },
		description: `<@${member.id}> adlı kullanıcı <#${newState.channel.id}> kanalına katıldı.`,
		footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
      });
    } else if (oldState.channel && !newState.channel) {
      await logger.logEvent({
        guild: oldState.guild,
		type: 'voice',
        title: null,
        author: { name: guild.name, iconURL: guild.iconURL() },
		description: `<@${member.id}> adlı kullanıcı <#${oldState.channel.id}> kanalından ayrıldı.`,
		footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
      });
    }
	
	
	// MUTE LOG
	if (!oldState.serverMute && newState.serverMute) {
      await logger.logEvent({
        guild: newState.guild,
		author: { name: guild.name, iconURL: guild.iconURL() },
        type: 'mute-voice',
        title: null,
        description: `<@${user.id}> adlı kullanıcı, <#${newState.channelId}> kanalında susturuldu.`,
		footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
      });
    }

    if (oldState.serverMute && !newState.serverMute) {
      await logger.logEvent({
        guild: newState.guild,
		author: { name: guild.name, iconURL: guild.iconURL() },
        type: 'mute-voice',
        title: null,
        description: `<@${user.id}>, kullanıcının <#${newState.channelId}> kanalındaki susturulması kaldırıldı.`,
		
        footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
      });
    }
	
  }
};
