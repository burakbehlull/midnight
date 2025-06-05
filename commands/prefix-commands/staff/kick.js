import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'kick',
  description: 'Kullanıcıyı sunucudan atar. m!kick @kullanıcı sebep veya m!kick kullanıcıID sebep',
  usage: 'kick <@user / userID> <reason>',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
      const sender = new messageSender(message);
      
      const ctrl = await PM.control(PM.flags.KickMembers, PM.flags.Administrator);
      if (!ctrl)
        return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));

      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

      if (!target)
        return sender.reply(sender.errorEmbed('❌ Atılacak kullanıcıyı etiketlemeli veya ID girmelisin.'));

      if (target.id === message.author.id)
        return sender.reply(sender.errorEmbed('❌ Kendini atamazsın.'));

      if (message.member.roles.highest.position <= target.roles.highest.position && message.guild.ownerId !== message.author.id)
        return sender.reply(sender.errorEmbed('❌ Senden yüksek veya eşit yetkide birini atamazsın.'));

      if (!target.kickable)
        return sender.reply(sender.errorEmbed('❌ Bu kullanıcı bot tarafından atılamıyor. Rolü bottan yüksek olabilir.'));

      await target.kick(reason);

      sender.reply(sender.embed({
        author: { name: message.guild.name, iconURL: message.guild.iconURL() },
        title: "Kullanıcı Atıldı",
        fields: [
          { name: 'Atılan Kullanıcı', value: `**${target.user.globalName || target.user.username}**\n(\`${target.id}\`)`, inline: true },
          { name: 'Yetkili', value: `**${message.author.globalName || message.author.username}**\n(\`${message.author.id}\`)`, inline: true },
          { name: 'Sebep', value: reason, inline: false }
        ],
        thumbnail: target.user.displayAvatarURL()
      }), true);

    } catch (err) {
      console.error('Kick komutu hatası: ', err);
      sender.reply(sender.errorEmbed('❌ Bir hata oluştu. Konsola bak.'));
    }
  }
};
