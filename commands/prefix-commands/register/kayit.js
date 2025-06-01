import Settings from "../../../models/Settings.js";
import { PermissionsManager } from '../../../managers/index.js';
import { messageSender } from '../../../helpers/index.js';
import { Button } from '../../../helpers/index.js';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'k',
  async execute(client, message, args) {
    const sender = new messageSender(message);
    const PM = new PermissionsManager(message);
    if (!await PM.control(PM.flags.ManageRoles)) return sender.reply("❌ Yetkin yok.", true);

    const member = message.mentions.members.first();
    if (!member || !args[1] || !args[2]) return sender.reply("❌ Kullanım: `.k @kullanıcı İsim Yaş`", true);

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.erkekRoleId || !settings?.kizRoleId)
      return sender.reply("❌ Roller ayarlanmamış. `/set` komutunu kullan.", true);

    await member.setNickname(`${args[1]} | ${args[2]}`);

    const btn = new Button();
    btn.add("erkek_btn", "Erkek", btn.style.Primary);
    btn.add("kadin_btn", "Kadın", btn.style.Danger);

    const msg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("👤 Kayıt")
          .setDescription(`${member} için cinsiyet seçin:`)
          .setColor("Blurple")
      ],
      components: [btn.build()]
    });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({ content: "❌ Bu buton sana ait değil.", ephemeral: true });

      if (i.customId === "erkek_btn") {
        await member.roles.add(settings.erkekRoleId);
        await i.update({ content: `<@&${settings.erkekRoleId}> rolü verildi.`, embeds: [], components: [] });
      } else if (i.customId === "kadin_btn") {
        await member.roles.add(settings.kizRoleId);
        await i.update({ content: `<@&${settings.kizRoleId}> rolü verildi.`, embeds: [], components: [] });
      }
    });
  }
}
