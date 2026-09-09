import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ComponentType, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';

import Manager from '#managers';
import { statsUtilsHandler } from '#handlers';
import { Level } from '#models';

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke, strokeWidth) {
	ctx.beginPath();
	ctx.roundRect(x, y, width, height, radius);
	if (fill) {
		ctx.fillStyle = fill;
		ctx.fill();
	}
	if (stroke && strokeWidth) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = strokeWidth;
		ctx.stroke();
	}
}

export default {
	name: 'stat',
	aliases: ['istatistiklerim', 'stats'],
	description: 'Kendi istatistiklerini gösterir',
	usage: 'stat',
	category: 'stats',

	permissions: {
		enabled: false
	},

	async execute(client, message) {
		const manager = new Manager(client, { action: message });
		const member = message.member;

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('me_menu')
			.setPlaceholder('Bir kategori seçin')
			.addOptions([
				{
					label: 'İstatistiklerim',
					description: 'Mesaj, ses ve kanal istatistiklerim',
					value: 'my_stats'
				}
			]);

		const row = new ActionRowBuilder().addComponents(selectMenu);

		const embed = manager.sender.embed({
			title: 'İstatistiklerim',
			description: 'Aşağıdaki menüden görmek istediğiniz istatistiği seçin:',
			fields: [
				{ name: 'İstatistiklerim', value: 'Mesaj, ses, sıralama ve en aktif kanallarınız', inline: false }
			],
			color: 0x5865f2
		});

		const reply = await message.channel.send({
			embeds: [embed],
			components: [row]
		});

		const collector = reply.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 300000
		});

		collector.on('collect', async (interaction) => {
			if (interaction.user.id !== message.author.id) {
				return interaction.reply({
					content: 'Bu menüyü sadece komutu kullanan kişi kullanabilir.',
					flags: 64
				});
			}

			await interaction.deferUpdate();

			try {
				const selected = interaction.values[0];
				let buffer;
				let filename;

				if (selected === 'my_stats') {
					buffer = await generateMyStatsCanvas(client, member, message.guild);
					filename = 'my-stats.png';
				}

				if (!buffer) {
					return interaction.followUp({
						content: 'Henüz istatistik veriniz yok.',
						flags: 64
					});
				}

				await reply.edit({
					embeds: [],
					files: [{
						attachment: buffer,
						name: filename
					}],
					components: [row]
				});
			} catch (error) {
				console.error('Canvas generation error:', error);
				await interaction.followUp({
					content: 'İstatistik oluşturulurken bir hata oluştu.',
					flags: 64
				});
			}
		});

		collector.on('end', () => {
			reply.edit({ components: [] }).catch(() => {});
		});
	}
};

async function generateMyStatsCanvas(client, member, guild) {
	const stats = await statsUtilsHandler.getUserStats(member.id, guild.id);
	const levelData = await Level.findOne({ userId: member.id, guildId: guild.id });
	
	if (!stats && !levelData) return null;

	const width = 1400;
	const height = 900;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#0f0f0f';
	ctx.fillRect(0, 0, width, height);

	const profileY = 100;
	
	try {
		const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
		const avatar = await loadImage(avatarURL);
		
		ctx.save();
		ctx.beginPath();
		ctx.arc(140, profileY, 70, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatar, 70, profileY - 70, 140, 140);
		ctx.restore();
	} catch {}

	ctx.font = 'bold 40px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	ctx.fillText(member.user.displayName || member.user.username, 230, profileY - 15);

	ctx.font = '22px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(`${stats?.days || 0} günlük veri`, 230, profileY + 20);

	ctx.font = 'bold 36px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('İstatistiklerim', width / 2, profileY - 15);

	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(guild.name, width / 2, profileY + 20);

	const startY = 240;
	const boxWidth = 420;
	const boxHeight = 300;
	const gapX = 30;

	const allMessageXP = await Level.find({ guildId: guild.id }).sort({ messageXP: -1 });
	const allVoiceXP = await Level.find({ guildId: guild.id }).sort({ voiceXP: -1 });
	const allCamera = await Level.find({ guildId: guild.id }).sort({ totalCameraOpens: -1 });
	const allStream = await Level.find({ guildId: guild.id }).sort({ totalStreams: -1 });

	const messageRank = allMessageXP.findIndex(u => u.userId === member.id) + 1;
	const voiceRank = allVoiceXP.findIndex(u => u.userId === member.id) + 1;
	const cameraRank = allCamera.findIndex(u => u.userId === member.id) + 1;
	const streamRank = allStream.findIndex(u => u.userId === member.id) + 1;

	drawRoundedRect(ctx, 50, startY, boxWidth, boxHeight, 15, '#1a1a1a');
	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('SIRALAMA BILGILERI', 50 + boxWidth / 2, startY + 35);
	
	const rankings = [
		{ label: 'SES', rank: voiceRank || 0 },
		{ label: 'MESAJ', rank: messageRank || 0 },
		{ label: 'YAYIN', rank: streamRank || 0 },
		{ label: 'KAMERA', rank: cameraRank || 0 }
	];

	rankings.forEach((item, i) => {
		const itemY = startY + 65 + (i * 55);
		drawRoundedRect(ctx, 70, itemY, boxWidth - 40, 45, 8, '#2a2a2a');
		
		ctx.font = 'bold 18px sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.fillText(item.label, 90, itemY + 28);
		
		let rankColor = '#888888';
		if (item.rank === 1) rankColor = '#FFD700';
		else if (item.rank === 2) rankColor = '#C0C0C0';
		else if (item.rank === 3) rankColor = '#CD7F32';
		else if (item.rank === 4) rankColor = '#FF8C00';
		else if (item.rank === 5) rankColor = '#A9A9A9';
		else if (item.rank === 6) rankColor = '#D2691E';
		
		ctx.font = 'bold 24px sans-serif';
		ctx.fillStyle = rankColor;
		ctx.textAlign = 'right';
		ctx.fillText(`#${item.rank}`, boxWidth + 10, itemY + 30);
	});

	drawRoundedRect(ctx, 50 + boxWidth + gapX, startY, boxWidth, boxHeight, 15, '#1a1a1a');
	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('MESAJ BILGILERI', 50 + boxWidth + gapX + boxWidth / 2, startY + 35);
	
	const messageStats = [
		{ label: 'TOPLAM', value: `${stats?.totalMessages || 0} mesaj` },
		{ label: 'BUGÜN', value: `${stats?.dailyMessages || 0} mesaj` },
		{ label: 'BU HAFTA', value: `${stats?.weeklyMessages || 0} mesaj` },
		{ label: 'BU AY', value: `${stats?.monthlyMessages || 0} mesaj` }
	];

	messageStats.forEach((item, i) => {
		const itemY = startY + 65 + (i * 55);
		drawRoundedRect(ctx, 70 + boxWidth + gapX, itemY, boxWidth - 40, 45, 8, '#2a2a2a');
		
		ctx.font = 'bold 18px sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.fillText(item.label, 90 + boxWidth + gapX, itemY + 28);
		
		ctx.font = 'bold 18px sans-serif';
		ctx.fillStyle = '#888888';
		ctx.textAlign = 'right';
		ctx.fillText(item.value, boxWidth + gapX + boxWidth + 10, itemY + 28);
	});


	const formatVoiceDuration = (ms) => {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		return `${hours}s ${minutes}d`;
	};

	drawRoundedRect(ctx, 50 + (boxWidth + gapX) * 2, startY, boxWidth, boxHeight, 15, '#1a1a1a');
	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('SES BILGILERI', 50 + (boxWidth + gapX) * 2 + boxWidth / 2, startY + 35);
	
	const voiceStats = [
		{ label: 'TOPLAM', value: formatVoiceDuration(stats?.totalVoiceMs || 0) },
		{ label: 'BUGÜN', value: formatVoiceDuration(stats?.dailyVoiceMs || 0) },
		{ label: 'BU HAFTA', value: formatVoiceDuration(stats?.weeklyVoiceMs || 0) },
		{ label: 'BU AY', value: formatVoiceDuration(stats?.monthlyVoiceMs || 0) }
	];

	voiceStats.forEach((item, i) => {
		const itemY = startY + 65 + (i * 55);
		drawRoundedRect(ctx, 70 + (boxWidth + gapX) * 2, itemY, boxWidth - 40, 45, 8, '#2a2a2a');
		
		ctx.font = 'bold 18px sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.fillText(item.label, 90 + (boxWidth + gapX) * 2, itemY + 28);
		
		ctx.font = 'bold 18px sans-serif';
		ctx.fillStyle = '#888888';
		ctx.textAlign = 'right';
		ctx.fillText(item.value, (boxWidth + gapX) * 2 + boxWidth + 10, itemY + 28);
	});

	const channelY = startY + boxHeight + 30;
	const channelBoxWidth = 620;

	drawRoundedRect(ctx, 50, channelY, channelBoxWidth, 280, 15, '#1a1a1a');
	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('EN AKTIF OLDUGU MESAJ KANALLARI', 50 + channelBoxWidth / 2, channelY + 35);
	
	const topMessageChannels = stats?.topMessageChannels?.slice(0, 3) || [];
	if (topMessageChannels.length > 0) {
		topMessageChannels.forEach((ch, i) => {
			const itemY = channelY + 65 + (i * 65);
			const channel = guild.channels.cache.get(ch.channelId);
			const channelName = channel ? `#${channel.name}` : 'Bilinmeyen Kanal';
			
			drawRoundedRect(ctx, 70, itemY, channelBoxWidth - 40, 55, 8, '#2a2a2a');
			
			ctx.font = 'bold 18px sans-serif';
			ctx.fillStyle = '#ffffff';
			ctx.textAlign = 'left';
			
			let displayName = channelName.length > 25 ? channelName.substring(0, 22) + '...' : channelName;
			ctx.fillText(displayName, 90, itemY + 25);
			
			ctx.font = '16px sans-serif';
			ctx.fillStyle = '#888888';
			ctx.fillText(`${ch.count} mesaj`, 90, itemY + 45);
		});
	} else {
		ctx.font = '18px sans-serif';
		ctx.fillStyle = '#555555';
		ctx.textAlign = 'center';
		ctx.fillText('Veri yok', 50 + channelBoxWidth / 2, channelY + 150);
	}

	drawRoundedRect(ctx, 50 + channelBoxWidth + gapX, channelY, channelBoxWidth, 280, 15, '#1a1a1a');
	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('EN AKTIF OLDUGU SES KANALLARI', 50 + channelBoxWidth + gapX + channelBoxWidth / 2, channelY + 35);
	
	const topVoiceChannels = stats?.topVoiceChannels?.slice(0, 3) || [];
	if (topVoiceChannels.length > 0) {
		topVoiceChannels.forEach((ch, i) => {
			const itemY = channelY + 65 + (i * 65);
			const channel = guild.channels.cache.get(ch.id);
			const channelName = channel ? channel.name : 'Bilinmeyen Kanal';
			
			drawRoundedRect(ctx, 70 + channelBoxWidth + gapX, itemY, channelBoxWidth - 40, 55, 8, '#2a2a2a');
			
			ctx.font = 'bold 18px sans-serif';
			ctx.fillStyle = '#ffffff';
			ctx.textAlign = 'left';
			
			let displayName = channelName.length > 25 ? channelName.substring(0, 22) + '...' : channelName;
			ctx.fillText(displayName, 90 + channelBoxWidth + gapX, itemY + 25);
			
			ctx.font = '16px sans-serif';
			ctx.fillStyle = '#888888';
			ctx.fillText(ch.duration, 90 + channelBoxWidth + gapX, itemY + 45);
		});
	} else {
		ctx.font = '18px sans-serif';
		ctx.fillStyle = '#555555';
		ctx.textAlign = 'center';
		ctx.fillText('Veri yok', 50 + channelBoxWidth + gapX + channelBoxWidth / 2, channelY + 150);
	}

	return await canvas.encode('png');
}

