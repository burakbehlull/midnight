import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'kick',
  description: 'Kullanıcıyı sunucudan atar. m!kick @kullanıcı sebep veya m!kick kullanıcıID sebep',
  usage: 'kick <@user / userID> <sebep>',
  async execute(client, message, args) {
    const PM = new PermissionsManager(message);
    const sender = new messageSender(message);

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    try {
      const hasPerm = await PM.control(PM.flags.KickMembers, PM.flags.Administrator);
      if (!hasPerm) {
        return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yeterli yetkin yok.'));
      }

      let target = message.mentions.members.first();
      if (!target && args[0]) {
        target = await message.guild.members.fetch(args[0]).catch(() => null);
      }
      if (!target) {
        return sender.reply(sender.errorEmbed('❌ Kicklenecek kullanıcıyı etiketlemeli veya geçerli bir ID girmelisin.'));
      }

      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

      if (target.id === message.author.id) {
        return sender.reply(sender.errorEmbed('❌ Kendini sunucudan atamazsın.'));
      }

      const botMember = message.guild.members.cache.get(client.user.id);

      if (!botMember.permissions.has('KickMembers')) {
        return sender.reply(sender.errorEmbed('❌ Botun kick yetkisi yok.'));
      }

      if (botMember.roles.highest.position <= target.roles.highest.position) {
        return sender.reply(sender.errorEmbed('❌ Botun rolü, atacağın kişiden yüksek olmalı.'));
      }

      if (message.member.roles.highest.position <= target.roles.highest.position) {
        return sender.reply(sender.errorEmbed('❌ Senden yüksek veya eşit yetkideki birini atamazsın.'));
      }

      if (target.id === message.guild.ownerId) {
        return sender.reply(sender.errorEmbed('❌ Sunucu sahibini atamazsın.'));
      }


      if (!target.kickable) {
        return sender.reply(sender.errorEmbed('❌ Bu kullanıcıyı sunucudan atamam. Botun yetkisi veya rolü yetersiz olabilir.'));
      }

      await target.kick(reason);

      return sender.reply(sender.embed({
        author: { name: message.guild.name, iconURL: message.guild.iconURL() },
        title: "Kullanıcı Sunucudan Atıldı",
        fields: [
          { name: 'Atılan Kullanıcı', value: `**${target.user.tag}**\n(${target.id})`, inline: true },
          { name: 'Atan', value: `**${message.author.tag}**\n(${message.author.id})`, inline: true },
          { name: 'Sebep', value: reason, inline: false }
        ],
        thumbnail: target.user.displayAvatarURL(),
      }), true);

    } catch (error) {
      console.error('Kick komutu hatası:', error);
      return sender.reply(sender.errorEmbed('❌ Sunucudan atma işlemi sırasında bir hata oluştu.'));
    }
  }
};
