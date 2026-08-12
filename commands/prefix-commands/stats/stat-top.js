import { EmbedBuilder } from 'discord.js';

import Manager from '#managers';
import { statsUtilsHandler } from '#handlers';

export default {
	name: 'stat-top',
	description: 'Sunucuda en çok konuşan kişileri listeler',
	usage: 'stat-top',
	category: 'stat',

	permissions: {
		enabled: false
	},
	
	async execute(client, message) {
		const topMessages = await statsUtilsHandler.getTopMessageUsers(message.guild.id);
		const topVoices = await statsUtilsHandler.getTopVoiceUsers(message.guild.id);
		const manager = new Manager(client, { action: message });

		const embed = manager.sender.embed({
			author: { name: message.guild.name, iconURL: message.guild.iconURL()},
			title: "Sunucu İstatistik Sıralamaları",
			color: "Gold",
			fields: [
				{
				name: '💬 **En Çok Mesaj Atanlar**',
				value: topMessages.length > 0
					? topMessages.map((u, i) => `${i + 1}. <@${u.userId}>: ${u.totalMessages} mesaj`).join('\n')
					: 'Veri yok',
				},
				{
				name: '🔊 **En Çok Seste Olanlar**',
				value: topVoices.length > 0
					? topVoices.map((u, i) => `${i + 1}. <@${u.userId}>: ${statsUtilsHandler.formatDuration(u.totalVoice)}`).join('\n')
					: 'Veri yok',
				},
			]
		})

		message.channel.send({ embeds: [embed] });
	}
};
