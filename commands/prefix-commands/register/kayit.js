import { EmbedBuilder, ComponentType } from 'discord.js';

import { Settings } from "#models";
import { PermissionsManager } from '#managers';
import { messageSender, Button } from '#helpers';


export default {
  name: 'kayit',
  async execute(client, message, args) {
	  
    const sender = new messageSender(message);
    const PM = new PermissionsManager(message);
	const ctrl = PM.control(PM.flags.ManageRoles)
	
    if (!ctrl) return sender.reply(sender.errorEmbed("❌ Yetkin yok."));

    const member = message.mentions.members.first();
    if (!member || !args[1] || !args[2]) return sender.reply(sender.errorEmbed("❌ Kullanım: `.k @kullanıcı İsim Yaş`"));

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.erkekRoleId || !settings?.kizRoleId)
      return sender.reply(sender.errorEmbed("❌ Roller ayarlanmamış. `/set` komutunu kullan."));

    await member.setNickname(`${args[1]} | ${args[2]}`);

    const btn = new Button();
    btn.add("erkek_btn", "Erkek", btn.style.Primary);
    btn.add("kadin_btn", "Kadın", btn.style.Danger);
	const row = btn.build();
    const msg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("Kayıt")
          .setDescription(`${member} için cinsiyet seçin:`)
          .setColor("Blurple")
      ],
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
		const IEmbed = sender.errorEmbed("❌ Bu buton sana ait değil.")
        return i.reply({ embeds: [IEmbed], ephemeral: true });

      if (i.customId === "erkek_btn") {
        await member.roles.add(settings.erkekRoleId);
        await i.update({ embeds: [sender.classic(`<@&${settings.erkekRoleId}> rolü verildi.`)], components: [] });
      } else if (i.customId === "kadin_btn") {
        await member.roles.add(settings.kizRoleId);
        await i.update({ embeds: [sender.classic(`<@&${settings.kizRoleId}> rolü verildi.`)], components: [] });
      }
    });
  }
}
