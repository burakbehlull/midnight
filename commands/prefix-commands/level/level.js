import { EmbedBuilder } from "discord.js";

import Manager from "#managers";
import{ Level } from "#models";

export default {
  name: "level",
  aliases: ["seviye"],
  description: "Kullanıcının level bilgisini gösterir",
  usage: ".level <me/@user>",
  category: 'level',
  async execute(client, message, args) {
    const target = message.mentions.users.first() || message.author;
    const userId = target.id;
    const guildId = message.guild.id;
	const manager = new Manager(client, { action: message });

    const userData = await Level.findOne({ userId, guildId });
    if (!userData) return message.channel.send({embeds: [manager.sender.errorEmbed(`${target} için bir kayıt bulunamadı.`)]});
    
	const embed = manager.sender.embed({
		author: { name: message.guild.name, iconURL: message.guild.iconURL()},
		title: `Seviye Bilgileri: \` ${target.globalName || target.username} \``,
		color: "Blue",
		fields: [
			{ name: "Mesaj XP", value: `**${userData.messageXP}**`, inline: true },
			{ name: "Mesaj Level", value: `**${userData.messageLevel || 0}**`, inline: true },
			{ name: "Ses XP", value: `**${userData.voiceXP || 0}**`, inline: true },
			{ name: "Ses Level", value: `**${userData.voiceLevel || 0}**`, inline: true },
			{ name: "Yayın Sayısı", value: `**${userData.totalStreams || 0}**`, inline: true },
			{ name: "Kamera Açma", value: `**${userData.totalCameraOpens || 0}**`, inline: true }
		],
		thumbnail: target.displayAvatarURL(),
	})

    message.channel.send({ embeds: [embed] });
  },
};
