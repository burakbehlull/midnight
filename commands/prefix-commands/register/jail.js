import { Punishment, Settings } from "#models";
import { messageSender } from "#helpers";


export default {
  name: "jail",
  aliases: ['hapis'],
  description: 'Belirtilen kullanıcıyu jaile atar',
  usage: 'jail @user süre sebep',
  category: 'moderation',
  async execute(client, message, args) {
	const sender = new messageSender(message)
	  
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const duration = args[1];
    const reason = args.slice(2).join(" ") || "Sebep belirtilmedi";

	if(!target) return sender.reply(sender.errorEmbed("Kullancı belirtin!"))

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.jailRoleId) return sender.reply(sender.errorEmbed("❌ Jail rolü ayarlanmamış."));

    await target.roles.set([settings.jailRoleId]);

    await Punishment.create({
      userId: target.id,
      guildId: message.guild.id,
      staffId: message.author.id,
      type: "jail",
      reason,
      duration
    });

	message.channel.send({ embeds: [sender.classic(`${target} adlı kullanıcı ${duration} boyunca cezalandırıldı.`)] });

  }
};
