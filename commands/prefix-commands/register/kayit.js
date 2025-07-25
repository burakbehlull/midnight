import { EmbedBuilder, ComponentType } from 'discord.js';
import { Settings, Staff } from "#models";
import { PermissionsManager } from '#managers';
import { messageSender, Button } from '#helpers';


export default {
  name: 'kayit',
  aliases: ["register", "kayıt", "k"],
  description: "Kullanıcıya kayıt rolü verir.",
  usage: ".kayıt @user isim | yaş",
  category: 'register',
  
  async execute(client, message, args) {
	  
    const sender = new messageSender(message);
    const PM = new PermissionsManager(message);
	const ctrl = await PM.control(PM.flags.ManageRoles)
	
    if (!ctrl) return sender.reply(sender.errorEmbed("❌ Yetkin yok."));

    const member = message.mentions.members.first();
    if (!member || !args[1] || !args[2]) return sender.reply(sender.errorEmbed("❌ Kullanım: `.k @kullanıcı İsim Yaş`"));

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.erkekRoleId || !settings?.kizRoleId)
      return sender.reply(sender.errorEmbed("❌ Roller ayarlanmamış. `/set` komutunu kullan."));

    await member.setNickname(`${args[1]} | ${args[2]}`);
	
	await Staff.findOneAndUpdate(
	  { userId: message.author.id, guildId: message.guild.id },
	  { $inc: { registerCount: 1 } },
	  { upsert: true, new: true }
	);

    const btn = new Button();
    btn.add("erkek_btn", "Erkek", btn.style.Primary);
    btn.add("kadin_btn", "Kadın", btn.style.Danger);
	const row = btn.build();
    const msg = await message.channel.send({
      embeds: [
		sender.embed({
			title: "Kayıt",
			description: `${member} için cinsiyet seçin: `,
			color: "Blurple"
		})
      ],
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({ embeds: [sender.errorEmbed("❌ Bu buton sana ait değil.")], ephemeral: true });

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
