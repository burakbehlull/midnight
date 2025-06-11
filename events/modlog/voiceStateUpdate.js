import { Events } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
	  
    const logger = new modLogger(client);
    const member = newState.member;
    const guild = newState.guild;

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
  }
};
