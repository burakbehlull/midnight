import { PermissionFlagsBits } from 'discord.js';
import Manager from '#managers';
import { Punishment, ForceBan } from '#models';
import { createMugshot } from '#helpers';

export default {
  name: 'ban',
  description: 'Kullanıcıyı banlar. m!ban @kullanıcı sebep veya m!ban kullanıcıID sebep',
  aliases: ['hüplet', 'yargı', 'primdog', 'orospu'],
  usage: 'ban <@user / userID> <sebep>',
  cooldown: 10,
  category: 'bans',

  permissions: {
    authorities: [PermissionFlagsBits.BanMembers, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;
    let banSucceeded = false;

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    try {
      const providedId = args[0]?.replace(/^<@!?(\d+)>$/, '$1');
      let target = message.mentions.members.first();

      if (!target && providedId) {
        target = await message.guild.members.fetch(providedId).catch(() => null);
      }
      if (!target) {
        return sender.reply(sender.errorEmbed('❌ Banlanacak kullanıcıyı etiketlemeli veya geçerli bir ID girmelisin.'));
      }

      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';


      const canMod = await manager.permissions.canModerate(message.author, target.user);
      if (!canMod) {
        return sender.reply(sender.errorEmbed('❌ Bu kullanıcıya işlem yapamazsınız. Rolünüz onunkinden yüksek değil.'));
      }

      const botMember = message.guild.members.me ?? await message.guild.members.fetchMe();

      if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        return sender.reply(sender.errorEmbed('❌ Botun ban yetkisi yok.'));
      }
      if (botMember.roles.highest.position <= target.roles.highest.position) {
        return sender.reply(sender.errorEmbed('❌ Botun rolü, banlayacağın kişiden yüksek olmalı.'));
      }
      if (!target.bannable) {
        return sender.reply(sender.errorEmbed('❌ Bu kullanıcıyı banlayamam. Botun yetkisi veya rolü yetersiz olabilir.'));
      }

  
      const existingProtection = await ForceBan.findOne({
        userId: target.id,
        guildId: message.guild.id,
      });
      if (existingProtection && ['forceban', 'godban'].includes(existingProtection.banType)) {
        const label = existingProtection.banType === 'godban' ? 'GOD BAN' : 'FORCE BAN';
        const cmd = existingProtection.banType === 'godban' ? 'ungodban' : 'unforceban';
        return sender.reply(sender.errorEmbed(
          `❌ **${target.user.tag}** şu anda **${label}** koruması altında.\n` +
          `Bu koruma normal ban komutuyla değiştirilemez. Kaldırmak için \`.${cmd}\` kullanılmalıdır.`,
        ));
      }

   
      await target.ban({ reason });
      banSucceeded = true;

  
      let punishmentRecord = null;
      try {
        punishmentRecord = await Punishment.create({
          userId: target.id,
          guildId: message.guild.id,
          staffId: message.author.id,
          type: 'ban',
          duration: null,
          reason,
        });
      } catch (error) {
        console.error('[ban] Punishment kaydedilemedi:', error);
      }

      try {
        await ForceBan.findOneAndUpdate(
          { userId: target.id, guildId: message.guild.id },
          {
            userId: target.id,
            guildId: message.guild.id,
            bannedBy: message.author.id,
            bannedAt: new Date(),
            reason,
            banType: 'ban',
          },
          { upsert: true, new: true },
        );
      } catch (error) {
        console.error('[ban] ForceBan kaydedilemedi:', error);
      }

      const recordId = punishmentRecord?.recordId ?? punishmentRecord?._id?.toString() ?? null;
      const recordIdText = recordId == null ? '' : `\n**Ceza No:** #${recordId}`;

      let attachment = null;
      try {
        attachment = await createMugshot({
          user: target.user,
          userId: target.id,
          title: message.guild.name,
          fields: {
            name: target.user.username.toLocaleUpperCase('tr-TR'),
            id: target.id,
            recordId: recordId,
          },
          fileName: 'banned-mugshot.png'
        });
      } catch (error) {
        console.error('[ban] Mugshot görseli oluşturulamadı:', error);
      }

      const embed = sender.embed({
        author: { name: message.guild.name, iconURL: message.guild.iconURL() },
        title: 'Kullanıcı Banlandı',
        description: ' ',
        ...(attachment ? { image: 'attachment://banned-mugshot.png' } : {}),
        fields: [
          {
            name: 'Banlanan Kullanıcı',
            value: `**${target.user.tag}**\n(${target.id})${recordIdText}`,
            inline: true,
          },
          {
            name: 'Banlayan',
            value: `**${message.author.tag}**\n(${message.author.id})`,
            inline: true,
          },
          { name: 'Sebep', value: reason, inline: false },
        ],
      });

      return message.reply({
        embeds: [embed],
        files: attachment ? [attachment] : [],
      });
    } catch (error) {
      console.error('[ban] Ban komutu hatası:', error);
      if (banSucceeded) {
        return sender.reply(sender.errorEmbed(
          '⚠️ Kullanıcı banlandı; fakat sonuç mesajı gönderilirken bir hata oluştu.',
        )).catch(() => null);
      }
      return sender.reply(sender.errorEmbed('❌ Ban işlemi sırasında bir hata oluştu.'));
    }
  },
};
