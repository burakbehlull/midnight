import { Settings } from "#models";
import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'kayıtsız',
  aliases: ["unregistered"],
  description: "Kullanıcıya kayıtsız rolü verir.",
  usage: ".kayıtsız @user",
  category: 'register',
  
  async execute(client, message, args) {
    const sender = new messageSender(message);
    const PM = new PermissionsManager(message);
	const ctrl = await PM.control(PM.flags.ManageRoles)
	
    if (!ctrl) return sender.reply(sender.errorEmbed("❌ Yetkin yok."));

    const member = message.mentions.members.first();
    if (!member) return sender.reply(sender.errorEmbed("❌ Kullanıcı etiketle."));

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.kayitsizRoleId) return sender.reply(sender.errorEmbed("❌ Kayıtsız rolü ayarlanmamış. `/set` komutunu kullan."));

    await member.roles.set([settings.kayitsizRoleId]);
    await sender.reply(sender.classic(`${member} adlı kullanıcıya kayıtsız rolü verildi.`));
  }
}
