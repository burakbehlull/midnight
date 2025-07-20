import { Staff } from "#models";
import { messageSender } from "#helpers";

export default {
  name: "task",
  aliases: ["görev", "tasks", "görevler"],
  description: "Kullanıcının istatistiklerini görür",
  usage: "task @user/userId",
  category: 'register',
  
  async execute(client, message) {
	const sender = new messageSender(message);

    const data = await Staff.findOne({ userId: message.author.id, guildId: message.guild.id });

    if (!data) return sender.reply(sender.errorEmbed("❌ Henüz hiçbir görev kaydın yok."));
	

    let formattedStartDate = "Yok";

    if (data.startedAt && !isNaN(new Date(data.startedAt).getTime())) {
      const date = new Date(data.startedAt);
      formattedStartDate = date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }
	
	const embed = sender.embed({
		author: { name: message.guild.name, iconURL: message.guild.iconURL()},
		title: `Görevler - \` ${message.author.username} \``,
		color: 0x00AE86,
		fields: [
			{ name: "Kayıt Sayısı", value: `${data.registerCount || 0}`, inline: true },
			{ name: "Yetkiye Başlatma", value: `${data.startedStaffCount || 0}`, inline: true },
			{ name: "Sorun Çözme Sayısı", value: `0`, inline: true },
			{ name: "Yetkiye Başlama Tarihi", value: formattedStartDate },
		]		
	})
	
    message.channel.send({ embeds: [embed] });
  }
};
