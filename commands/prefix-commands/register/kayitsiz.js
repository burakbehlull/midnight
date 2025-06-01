import Settings from "../../../models/Settings.js";
import { PermissionsManager } from '../../../managers/index.js';
import { messageSender } from '../../../helpers/index.js';

export default {
  name: 'kayıtsız',
  async execute(client, message, args) {
    const sender = new messageSender(message);
    const PM = new PermissionsManager(message);
    if (!await PM.control(PM.flags.ManageRoles)) return sender.reply("❌ Yetkin yok.", true);

    const member = message.mentions.members.first();
    if (!member) return sender.reply("❌ Kullanıcı etiketle.", true);

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.kayitsizRoleId) return sender.reply("❌ Kayıtsız rolü ayarlanmamış. `/set` komutunu kullan.", true);

    await member.roles.set([settings.kayitsizRoleId]);
    await sender.reply(`${member} adlı kullanıcıya kayıtsız rolü verildi.`);
  }
}
