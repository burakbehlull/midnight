import { Events } from 'discord.js';
import { modLogger } from '#helpers';
import { Settings } from '#models';

export default {
  name: Events.MessageCreate,
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    let prefix = process.env.PREFIX;
    try {
      const settings = await Settings.findOne({ guildId: message.guild.id }).lean();
      if (settings?.prefix) prefix = settings.prefix;
    } catch (err) {
      console.error('[modlog/messageCreate] Prefix okunurken hata:', err);
    }

    if (!prefix || !message.content.startsWith(prefix)) return;

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
