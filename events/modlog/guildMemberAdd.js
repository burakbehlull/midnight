import { Events } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
    const logger = new modLogger(client);
    await logger.logEvent({
      guild: member.guild,
	  author: { name: member.guild.name, iconURL: member.guild.iconURL() },
      type: 'joinLeave',
      title: null,
	  color: '#6A9BD8',
	  description: `<@${member.id}> adlı kullanıcı sunucuya giriş yaptı!`,
	  footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
    });
  }
};
