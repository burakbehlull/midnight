import { Punishment, Settings } from "#models";
import Manager from "#managers";
import { PermissionFlagsBits } from "discord.js";


export default {
  name: "jail",
  aliases: ['hapis'],
  description: 'Belirtilen kullanıcıyu jaile atar',
  usage: 'jail @user süre sebep',
  category: 'staff',

  permissions: {
    authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },


  async execute(client, message, args) {
	  const sender = new Manager(client, { action: message }).sender;

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const duration = args[1];
    const reason = args.slice(2).join(" ") || "Sebep belirtilmedi";

	  if(!target) return sender.reply(sender.errorEmbed("❌ Kullanıcı belirtin!"))

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.jailRoleId) return sender.reply(sender.errorEmbed("❌ Jail rolü ayarlanmamış."));

    if (target.roles.cache.has(settings.jailRoleId)) {
      return sender.reply(sender.errorEmbed("❌ Bu kullanıcı zaten jail'de!"));
    }

    try {
      await target.roles.set([settings.jailRoleId]);

      await Punishment.create({
        userId: target.id,
        guildId: message.guild.id,
        staffId: message.author.id,
        type: "jail",
        reason,
        duration,
        active: true
      });

      message.channel.send({ 
        embeds: [sender.classic(`${target} adlı kullanıcı ${duration} boyunca jail'e atıldı.\n**Sebep:** ${reason}`)] 
      });
    } catch (err) {
      console.error('Jail hatası:', err);
      return sender.reply(sender.errorEmbed("❌ Jail rolü verilirken bir hata oluştu!"));
    }
  }
};
