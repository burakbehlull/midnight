import { SlashCommandBuilder } from 'discord.js';
import Manager from '#managers';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command, replies with pong.'),
  async execute(interaction) {
    
	  const manager = new Manager(client, { action: interaction })
    
    const theme = await manager.theme.embedThemeBuilder(manager.theme.themes.classic, {
      action: true,
      description: 'Pong! 🏓',
      footer: manager.theme.getNameAndAvatars("user", message), 
    })

    if(!manager.config.DEVELOPMENT_MODE) return await manager.sender.reply(manager.sender.errorEmbed('Geliştirme modunda değilim, bu komutu kullanamazsınız!'));
    
    await theme.reply()
  },
};
