import { PermissionsManager } from '../../managers/index.js';

export default {
  name: 'example',
  description: 'Example command, replies with pong.',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
	  
      const ctrl = await PM.control(PM.flags.BanMembers, PM.flags.Administrator)
	  if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');
	  
      message.reply('Example! 🏓');
    } catch (err) {
      console.error('error: ', err);
    }
  },
};
