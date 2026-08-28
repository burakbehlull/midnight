import Manager from '#managers';
import { PermissionsBitField } from 'discord.js';

export default {
  name: 'test',
  description: 'Example command, test.',
  permissions: {
    authorities: [],
    user: ['470548458072440842'],
    roles: []
  },
  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });
	
      if(!manager.config.DEVELOPMENT_MODE) return await manager.sender.reply(manager.sender.errorEmbed('Geliştirme modunda değilim, bu komutu kullanamazsınız!'));
      
      await manager.sender.reply("Test is active! 🏓");

    } catch (err) {
      console.error('error: ', err);
    }
  },
};
