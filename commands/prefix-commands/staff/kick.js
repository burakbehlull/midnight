import Manager from '#managers';
import { Punishment } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'kick',
  description: 'Kullanıcıyı sunucudan atar. m!kick @kullanıcı sebep veya m!kick kullanıcıID sebep',
  usage: 'kick <@user / userID> <sebep>',
  cooldown: 10,
  category: 'moderation',
  permissions: {
      authorities: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.Administrator],
  },
  
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    try {

      let target = message.mentions.members.first();
      if (!target && args[0]) {
        target = await message.guild.members.fetch(args[0]).catch(() => null);
      }
      if (!target) {
        return sender.reply(sender.errorEmbed('❌ Kicklenecek kullanıcıyı etiketlemeli veya geçerli bir ID girmelisin.'));
      }

      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

      const canMod = await manager.permissions.canModerate(message.author, target.user);
      if (!canMod) {
        return sender.reply(sender.errorEmbed('❌ Bu kullanıcıya işlem yapamazsınız. Rolünüz onunkinden yüksek değil.'));
      }

      const botMember = message.guild.members.cache.get(client.user.id);

      if (!botMember.permissions.has('KickMembers')) {
        return sender.reply(sender.errorEmbed('❌ Botun kick yetkisi yok.'));
      }

      if (botMember.roles.highest.position <= target.roles.highest.position) {
        return sender.reply(sender.errorEmbed('❌ Botun rolü, atacağın kişiden yüksek olmalı.'));
      }

      if (!target.kickable) {
        return sender.reply(sender.errorEmbed('❌ Bu kullanıcıyı sunucudan atamam. Botun yetkisi veya rolü yetersiz olabilir.'));
      }

      await target.kick(reason);

      let punishmentRecord = null;
      try {
        punishmentRecord = await Punishment.create({
          userId: target.id,
          guildId: message.guild.id,
          staffId: message.author.id,
          type: "kick",
          reason
        });
      } catch (err) {
        console.error('[kick] Punishment kaydedilemedi:', err);
      }

      const recordIdText = punishmentRecord ? `\n**Ceza No:** #${punishmentRecord.recordId}` : '';

      sender.reply(sender.embed({
        author: { name: message.guild.name, iconURL: message.guild.iconURL() },
        title: "Kullanıcı Sunucudan Atıldı",
        fields: [
          { name: 'Atılan Kullanıcı', value: `**${target.user.tag}**\n(${target.id})${recordIdText}`, inline: true },
          { name: 'Atan', value: `**${message.author.tag}**\n(${message.author.id})`, inline: true },
          { name: 'Sebep', value: reason, inline: false }
        ],
        thumbnail: target.user.displayAvatarURL(),
      }), true);

      return


    } catch (error) {
      console.error('Kick komutu hatası:', error);
      return sender.reply(sender.errorEmbed('❌ Sunucudan atma işlemi sırasında bir hata oluştu.'));
    }
  }
};
