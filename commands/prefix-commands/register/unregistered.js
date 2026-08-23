import Manager from "#managers";
import { Settings } from "#models";
import { PermissionFlagsBits } from "discord.js";

export default {
  name: 'kayıtsız',
  aliases: ["unregistered"],
  description: "Kullanıcıya kayıtsız rolü verir.",
  usage: ".kayıtsız @user",
  category: 'register',
  
  permissions: {
    authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },


  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;


    const member = message.mentions.members.first();
    if (!member) return sender.reply(sender.errorEmbed("❌ Kullanıcı etiketle."));

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.kayitsizRoleId) return sender.reply(sender.errorEmbed("❌ Kayıtsız rolü ayarlanmamış. `/set` komutunu kullan."));

    await member.roles.set([settings.kayitsizRoleId]);
    await sender.reply(sender.classic(`${member} adlı kullanıcıya kayıtsız rolü verildi.`));
  }
}
