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
	  console.log(message.author)
	  
	  const x = { name: message.guild.name, iconURL: message.guild.iconURL()}
	  
      await sender.reply(sender.embed({
		  author: x,
		  title: "Kullanıcı Banlandı",
		  fields: [
				{ name: 'Banlanan Kullanıcı', value: `xdasda`, inline: true },
				{ name: 'Banlayan', value: `wwww`, inline: true },
				{ name: 'Sebep', value: `hhh`, inline: false }
			  ],
		  thumbnail: message.author.displayAvatarURL()
	  }), true)
    } catch (err) {
      console.error('error: ', err);
    }
  },
};
