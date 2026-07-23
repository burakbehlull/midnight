import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

import config from '../../config.json' with { type: 'json' };


export default {
  name: 'ping',
  description: 'Example command, ping.',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
	    const sender = new messageSender(message)
	
      if(!config.DEVELOPMENT_MODE) return await sender.reply(sender.errorEmbed('Geliştirme modunda değilim, bu komutu kullanamazsınız!'));
      
      await sender.reply("Pong! 🏓");

    } catch (err) {
      console.error('error: ', err);
    }
  },
};
