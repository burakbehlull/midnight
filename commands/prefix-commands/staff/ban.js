import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'ban',
  description: 'Kullanıcıyı banlar. m!ban @kullanıcı sebep veya m!ban kullanıcıID sebep',
  usage: 'ban <@user / userID> <reason>',
  aliases: ['hüplet'],
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
	  const sender = new messageSender(message);
	  
      const ctrl = await PM.control(PM.flags.BanMembers, PM.flags.Administrator)
	  if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));

      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';
      
	  if (!target) return sender.reply(sender.errorEmbed('❌ Banlanacak kullanıcıyı etiketlemeli veya ID girmelisin.'));
	  if (!target.bannable) return sender.reply(sender.errorEmbed('❌ Kendini ve rolü senden yüksek olanları banlayamazsın.'));
      
      await target.ban({ reason });
	  
	  sender.reply(sender.embed({
		  author: { name: message.guild.name, iconURL: message.guild.iconURL()},
		  title: "Kullanıcı Banlandı",
		  fields: [
			{ name: 'Banlanan Kullanıcı', value: `**${target.user.globalName || target.user.username}** \n (${target.id})`, inline: true },
			{ name: 'Banlayan', value: `**${message.author.globalName || target.author.username}** \n (${message.author.id})`, inline: true },
			{ name: 'Sebep', value: reason, inline: false }
		  ],
		  thumbnail: target.user.displayAvatarURL(),
		  
	  }), true)
	  
    } catch (err) {
      console.error('Ban komutu hatası: ', err);
      sender.reply(sender.errorEmbed('❌ Bir hata oluştu. Konsola bak.'));
    }
  }
};
