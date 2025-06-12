import { Events } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.MessageDelete,
  async execute(client, message) {
    if (message.author?.bot) return;

    const logger = new modLogger(client);
	
	await logger.logEvent({
	  guild: message.guild,
	  author: { name: message.guild.name, iconURL: message.guild.iconURL() },
      type: 'message',
      title: null,
	  color: '#d90f0f',
	  description: `
		**Kişi**: <@${message.author.id}>
		**Kanal**: <#${message.channel.id}>
		**Silinen Mesaj**: \` ${message.content || "boş"} \`
	  `,
	  footer: { text: message.author.tag, iconURL: message.author.displayAvatarURL() }
    });
	
  }
};