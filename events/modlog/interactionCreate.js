import { Events } from 'discord.js';
import { modLogger } from '#helpers';

export default {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) return;

    const logger = new modLogger(client);
    const cmd = interaction.commandName;
    const args = interaction.options.data
      .map(opt => `${opt.name}: ${opt.value}`)
      .join(', ');

    await logger.logEvent({
      guild: interaction.guild,
      type: 'command',
	  color: '#e02299',
	  title: null,
	  author: { name: interaction.guild.name, iconURL: interaction.guild.iconURL() },
	  description: `<@${interaction.user.id}>, <#${interaction.channel?.id}> kanalında, \`${cmd}\` komutunu kullandı.\n**İçerik**:  \`/${cmd} ${args}\``,
	  footer: { text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() }

    });
  }
};
