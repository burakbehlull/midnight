import { Staff } from "#models";
import { messageSender } from "#helpers";


export default {
  name: "yetkililerim",
  aliases: ["myofficials"],
  description: "Kullanıcının çektiği yetkilileri gösterir",
  usage: "yetkililerim",
  category: 'register',
  
  async execute(client, message) {
	const sender = new messageSender(message)
	  
    const staff = await Staff.findOne({ userId: message.author.id, guildId: message.guild.id });

    if (!staff?.startedUsers?.length) return sender.reply(sender.errorEmbed("❌ Hiç yetkili başlatmamışsın."));

    const list = staff.startedUsers.map((id, i) => `${i + 1}. <@${id}>`).join("\n");

    message.channel.send({
      embeds: [{
        title: "Başlattığın Yetkililer",
        description: list,
        color: 0x3498db
      }]
    });
  }
};
