import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'test',
  description: 'Example command, test.',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
	  const sender = new messageSender(message)
	
	  
	  sender.reply("he")
	  
      
    } catch (err) {
      console.error('error: ', err);
    }
  },
};
