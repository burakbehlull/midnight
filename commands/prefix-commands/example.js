import { PermissionsManager } from '../../managers/index.js';
import { messageSender } from '../../helpers/index.js';

export default {
  name: 'example',
  description: 'Example command, replies with pong.',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
	  const sender = new messageSender(message)
	
      const ctrl = await PM.control(PM.flags.BanMembers, PM.flags.Administrator)
	  if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');
	  
      await sender.reply(sender.embed({title:"merhaba"}), true)
    } catch (err) {
      console.error('error: ', err);
    }
  },
};
