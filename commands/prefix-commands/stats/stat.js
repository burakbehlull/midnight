import { statsUtilsHandler } from '#handlers';
import { messageSender } from '#helpers';

export default {
  name: 'stat',
  async execute(client, message, args) {
    const user = message.mentions.users.first() || message.author;
    const stats = await statsUtilsHandler.getUserStats(user.id, message.guild.id);
	const sender = new messageSender(message)

    if (!stats) return sender.reply(sender.errorEmbed('Bu kullanıcıya ait istatistik verisi bulunamadı.'));
	const embed = sender.embed({
		author: { name: message.guild.name, iconURL: message.guild.iconURL()},
		title: `${user.globalName} adlı kullanıcının istatistikleri`,
		color: 'Blue',
		fields: [
			{ name: '**Kapsam**', value: `**${stats.days}** günlük veri`, inline: true },
			{ name: '**Mesajlar**', value: `Toplam: **${stats.totalMessages}**\nHaftalık: **${stats.weeklyMessages}**\nGünlük: **${stats.dailyMessages}**`, inline:true },
			{ name: '**Ses**', value: `Toplam: **${stats.totalVoice}**\nHaftalık: **${stats.weeklyVoice}**\nGünlük: **${stats.dailyVoice}**` },
			{ name: '**En Aktif Mesaj Kanalları**', value: stats.topMessageChannels.map((c, i) => `${i + 1}. <#${c.channelId}> : \`${c.count} mesaj\``).join('\n') || 'Veri yok' },
			{ name: '**En Aktif Ses Kanalları**', value: stats.topVoiceChannels.map((c, i) => `${i + 1}. <#${c.id}>: \`${c.duration}\` `).join('\n') || 'Veri yok' },
		],
		thumbnail: user.displayAvatarURL(),
	})
    message.channel.send({ embeds: [embed] });
  }
};
