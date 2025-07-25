import { Events } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.MessageCreate,
  async execute(client, message) {
    const prefix = process.env.PREFIX;
    if (message.author.bot || !message.guild || !message.content.startsWith(prefix)) return;

    const commandBody = message.content.slice(prefix.length).trim();
    const args = commandBody.split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    const command = client.prefixCommands?.get(commandName);
    if (!command) return;

    const logger = new modLogger(client);
    await logger.logEvent({
      guild: message.guild,
      type: 'command',
      color: '#e02299',
      title: null,
      author: { name: message.guild.name, iconURL: message.guild.iconURL() },
      description: `<@${message.author.id}>, <#${message.channel.id}> kanalında, \`${commandName}\` komutunu kullandı.\n**İçerik**:  \`${prefix}${commandName} ${args.join(' ')}\``,
      footer: { text: message.author.tag, iconURL: message.author.displayAvatarURL() }
    });
  }
};
