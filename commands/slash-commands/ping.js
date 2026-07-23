import { SlashCommandBuilder } from 'discord.js';
import { messageSender } from '#helpers';

import config from '../../config.json' with { type: 'json' };

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command, replies with pong.'),
  async execute(interaction) {
    
	  const sender = new messageSender(interaction)

    if(!config.DEVELOPMENT_MODE) return await sender.reply(sender.errorEmbed('Geliştirme modunda değilim, bu komutu kullanamazsınız!'));
    
    await sender.reply('Pong! 🏓');
  },
};
