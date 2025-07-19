import { Punishment } from "#models";
import { messageSender } from "#helpers";

export default {
  name: "ceza",
  aliases: ['punish'],
  description: 'Belirtilen kullanıcıya ceza verir',
  usage: 'ceza @user sebep',
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
      type: "manual",
      reason
    });

	message.channel.send({ embeds: [sender.classic(`${target} için ceza kaydı oluşturuldu.`)] });

  }
};
