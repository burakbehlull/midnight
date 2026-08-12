import Manager from '#managers';
import { PermissionsBitField } from 'discord.js';

export default {
  name: 'ping',
  description: 'Example command, ping.',
  permissions: {
    authorities: [],
    user: ['470548458072440842'],
    roles: []
  },
  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });
	
      if(!manager.config.DEVELOPMENT_MODE) return await manager.sender.reply(manager.sender.errorEmbed('Geliştirme modunda değilim, bu komutu kullanamazsınız!'));
      
      await manager.sender.reply("Pong! 🏓");

    } catch (err) {
      console.error('error: ', err);
    }
  },
};
