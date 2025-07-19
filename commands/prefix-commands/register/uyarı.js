import { Punishment } from "#models";
import { messageSender } from "#helpers";

export default {
  name: "uyarı",
  aliases: ['uyari', 'warn'],
  description: 'Belirtilen kullanıcıya uyarı verir',
  usage: 'uyarı @user sebep',
  category: 'moderation',
  
  async execute(client, message, args) {
	const sender = new messageSender(message)

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi";
	
	if(!target) return sender.reply(sender.errorEmbed("Kullancı belirtin!"))
		
    await Punishment.create({
      userId: target.id,
      guildId: message.guild.id,
      staffId: message.author.id,
      type: "warn",
      reason
    });
	
	message.channel.send({ embeds: [sender.classic(`${target} uyarıldı.`)] });
  }
};
