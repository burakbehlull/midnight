import { Events } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.MessageUpdate,
  async execute(client, oldMessage, newMessage) {
    if (newMessage.author?.bot) return;

    const logger = new modLogger(client);
    const guild = newMessage.guild;

    await logger.logEvent({
      guild,
      type: 'message',
      title: 'Mesaj Güncellendi',
	  color: '#f7e21e',
	  description: `
		**Kişi**: <@${newMessage.author.id}>
		**Kanal**: <#${newMessage.channel.id}>
		**Eski Mesaj**: \` ${oldMessage.content || "yok"} \`
		**Yeni Mesaj**: \` ${newMessage.content || "yok"} \`
	  `,
      author: { name: newMessage.guild.name, iconURL: newMessage.guild.iconURL() },
	  footer: { text: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() }
    });
  }
};
