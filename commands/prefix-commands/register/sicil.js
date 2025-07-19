import { Punishment } from "#models";
import { messageSender } from "#helpers";

export default {
  name: "sicil",
  aliases: ['record'],
  description: 'Belirtilen kullanıcının sicilini gösterir',
  usage: 'sicil me/@user',
  category: 'moderation',
  
  async execute(client, message, args) {
	const sender = new messageSender(message)
	  
    const userId = message.mentions.users.first()?.id || args[0];
    const data = await Punishment.find({ userId, guildId: message.guild.id });

    const warns = data.filter(d => d.type === 'warn');
    const jails = data.filter(d => d.type === 'jail');
    const manuals = data.filter(d => d.type === 'manual');

    const embed = sender.embed({
	  author: { name: message.guild.name, iconURL: message.guild.iconURL()},
      title: "Kullanıcı Sicili",
      description: `<@${userId}> kullanıcısının ceza geçmişi:`,
      fields: [
        { name: `Genel Cezalar [${manuals.length}]`, value: manuals.map(m => `• ${m.reason} (${m.date.toLocaleDateString()})`).join("\n") || "Yok" },
        { name: `Uyarılar [${warns.length}]`, value: warns.map(w => `• ${w.reason} (${w.date.toLocaleDateString()})`).join("\n") || "Yok" },
        { name: `Jail Cezaları [${jails.length}]`, value: jails.map(j => `• ${j.reason} (${j.date.toLocaleDateString()}) - ${j.duration}`).join("\n") || "Yok" }
      ],
      color: 0xe74c3c
    })

    message.channel.send({ embeds: [embed] });
  }
};
