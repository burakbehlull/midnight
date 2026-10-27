import Manager from '#managers';
import { Punishment, ForceBan } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'ban',
  description: 'Kullanıcıyı banlar. m!ban @kullanıcı sebep veya m!ban kullanıcıID sebep',
  aliases: ["hüplet", "yargı", "primdog", "orospu"],
  usage: 'ban <@user / userID> <sebep>',
  cooldown: 10,
  category: 'bans',

  permissions: {
    authorities: [PermissionFlagsBits.BanMembers, PermissionFlagsBits.Administrator],
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
		if(!target) target = message.guild.members.cache.get(args[0]);
      }
      if (!target) {
        return sender.reply(sender.errorEmbed('❌ Banlanacak kullanıcıyı etiketlemeli veya geçerli bir ID girmelisin.'));
      }

      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

      // Rol hiyerarşisi kontrolü
      const canMod = await manager.permissions.canModerate(message.author, target.user);
      if (!canMod) {
        return sender.reply(sender.errorEmbed('❌ Bu kullanıcıya işlem yapamazsınız. Rolünüz onunkinden yüksek değil.'));
      }

      const botMember = message.guild.members.cache.get(client.user.id);

      if (!botMember.permissions.has('BanMembers')) {
        return sender.reply(sender.errorEmbed('❌ Botun ban yetkisi yok.'));
      }

      if (botMember.roles.highest.position <= target.roles.highest.position) {
        return sender.reply(sender.errorEmbed('❌ Botun rolü, banlayacağın kişiden yüksek olmalı.'));
      }

      if (!target.bannable) {
        return sender.reply(sender.errorEmbed('❌ Bu kullanıcıyı banlayamam. Botun yetkisi veya rolü yetersiz olabilir.'));
      }

      const existingProtection = await ForceBan.findOne({ userId: target.id, guildId: message.guild.id });
      if (existingProtection && (existingProtection.banType === 'forceban' || existingProtection.banType === 'godban')) {
        const label = existingProtection.banType === 'godban' ? 'GOD BAN' : 'FORCE BAN';
        const cmd = existingProtection.banType === 'godban' ? 'ungodban' : 'unforceban';
        return sender.reply(sender.errorEmbed(
          `❌ **${target.user?.tag || target.id}** şu anda **${label}** koruması altında.\n` +
          `Bu koruma normal ban komutuyla değiştirilemez. Kaldırmak için \`.${cmd}\` kullanılmalıdır.`
        ));
      }

      await target.ban({ reason });

      let punishmentRecord = null;
      try {
        punishmentRecord = await Punishment.create({
          userId: target.id,
          guildId: message.guild.id,
          staffId: message.author.id,
          type: "ban",
          duration: null,
          reason
        });
      } catch (err) {
        console.error('[ban] Punishment kaydedilemedi:', err);
      }

      try {
        await ForceBan.findOneAndUpdate(
          { userId: target.id, guildId: message.guild.id },
          {
            userId: target.id,
            guildId: message.guild.id,
            bannedBy: message.author.id,
            bannedAt: new Date(),
            reason: reason,
            banType: 'ban',
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('[ban] ForceBan kaydedilemedi:', err);
      }

      const avatarURL = target.user?.displayAvatarURL({ dynamic: true, size: 256 }) || 
                        target.displayAvatarURL?.({ dynamic: true, size: 256 }) ||
                        `https://cdn.discordapp.com/embed/avatars/${(parseInt(target.id) >> 22) % 6}.png`;
      
      const recordIdText = punishmentRecord ? `\n**Ceza No:** #${punishmentRecord.recordId}` : '';

      return sender.reply(sender.embed({
        author: { name: message.guild.name, iconURL: message.guild.iconURL() },
        title: "Kullanıcı Banlandı",
        fields: [
          { name: 'Banlanan Kullanıcı', value: `**${target.user?.tag || target.tag}**\n(${target.id})${recordIdText}`, inline: true },
          { name: 'Banlayan', value: `**${message.author.tag}**\n(${message.author.id})`, inline: true },
          { name: 'Sebep', value: reason, inline: false },
        ],
        thumbnail: avatarURL,
      }), true);

    } catch (error) {
      console.error('Ban komutu hatası:', error);
      return sender.reply(sender.errorEmbed('❌ Ban işlemi sırasında bir hata oluştu.'));
    }
  }
};
