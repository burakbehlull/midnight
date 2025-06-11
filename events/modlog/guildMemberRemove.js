import { Events } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    const logger = new modLogger(client);
    await logger.logEvent({
      guild: member.guild,
	  author: { name: member.guild.name, iconURL: member.guild.iconURL() },
      type: 'joinLeave',
      title: "Çıkış Log",
	  description: `<@${member.id}> adlı kullanıcı sunucudan çıkış yaptı!`,
	  footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }

    });
  }
};
