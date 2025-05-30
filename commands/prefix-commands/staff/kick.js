import { PermissionsManager } from '../../../managers/index.js';
import { messageSender } from '../../../helpers/index.js';

export default {
  name: 'kick',
  description: 'Kullanıcıyı sunucudan atar. m!kick @kullanıcı sebep veya m!kick kullanıcıID sebep',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
      const sender = new messageSender(message);
      
      const ctrl = await PM.control(PM.flags.KickMembers, PM.flags.Administrator);
      if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');

      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

      if (!target) return message.reply('❌ Atılacak kullanıcıyı etiketlemeli veya ID girmelisin.');
      if (!target.kickable) return message.reply('❌ Bu kullanıcıyı atamıyorum. Rolü benden yüksek olabilir.');

      await target.kick(reason);

      sender.reply(sender.embed({
        author: { name: message.guild.name, iconURL: message.guild.iconURL() },
        title: "Kullanıcı Atıldı",
        fields: [
          { name: 'Atılan Kullanıcı', value: `**${target.user.globalName || target.user.username}**\n(${target.id})`, inline: true },
          { name: 'Atan', value: `**${message.author.globalName || message.author.username}**\n(${message.author.id})`, inline: true },
          { name: 'Sebep', value: reason, inline: false }
        ],
        thumbnail: target.user.displayAvatarURL()
      }), true);

    } catch (err) {
      console.error('Kick komutu hatası: ', err);
      message.reply('❌ Bir hata oluştu. Konsola bak.');
    }
  }
};
