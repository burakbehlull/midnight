import { Punishment, Settings } from "#models";
import Manager from "#managers";
import { PermissionFlagsBits } from "discord.js";

export default {
  name: "unjail",
  aliases: ['unjaill', 'cezakaldır'],
  description: 'Belirtilen kullanıcının jail cezasını kaldırır',
  usage: 'unjail @user/userId',
  category: 'staff',

  permissions: {
    authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

    if (!target) {
      return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı belirtin!"));
    }

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.jailRoleId) {
      return sender.reply(sender.errorEmbed("❌ Jail rolü ayarlanmamış."));
    }

    // Jail rolü var mı kontrol et
    if (!target.roles.cache.has(settings.jailRoleId)) {
      return sender.reply(sender.errorEmbed("❌ Bu kullanıcıda jail rolü yok!"));
    }

    try {
      // Jail rolünü çek
      await target.roles.remove(settings.jailRoleId);

      // Punishment kaydını güncelle (active = false)
      await Punishment.updateMany(
        {
          userId: target.id,
          guildId: message.guild.id,
          type: "jail",
          active: true
        },
        {
          $set: {
            active: false,
            removedAt: new Date(),
            removedBy: message.author.id
          }
        }
      );

      message.channel.send({
        embeds: [sender.classic(`✅ ${target} adlı kullanıcının jail cezası kaldırıldı.`)]
      });
    } catch (err) {
      console.error('Unjail hatası:', err);
      return sender.reply(sender.errorEmbed("❌ Jail rolü kaldırılırken bir hata oluştu!"));
    }
  }
};
