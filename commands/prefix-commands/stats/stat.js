import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ComponentType, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';

import Manager from '#managers';
import { statsUtilsHandler } from '#handlers';
import { Level, InviteModel } from '#models';

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
				},
				{
					label: 'Detaylı İstatistikler',
					description: 'En aktif olduğum kanallar',
					value: 'detailed_stats'
				},
				{
					label: 'Level & Davet İstatistikleri',
					description: 'XP, level ve davet bilgilerim',
					value: 'level_invite_stats'
				}
			]);

		const row = new ActionRowBuilder().addComponents(selectMenu);

		const embed = manager.sender.embed({
			title: 'İstatistiklerim',
			description: 'Aşağıdaki menüden görmek istediğiniz istatistiği seçin:',
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
				} else if (selected === 'detailed_stats') {
					buffer = await generateDetailedStatsCanvas(client, member, message.guild);
					filename = 'detailed-stats.png';
				} else if (selected === 'level_invite_stats') {
					buffer = await generateLevelInviteStatsCanvas(client, member, message.guild);
					filename = 'level-invite-stats.png';
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
			// Önce Discord'dan al, yoksa veritabanından
			const channelName = channel ? `#${channel.name}` : (ch.channelName ? `#${ch.channelName}` : 'Bilinmeyen Kanal');
			
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
			// Önce Discord'dan al, yoksa veritabanından
			const channelName = channel ? channel.name : (ch.channelName ? ch.channelName : 'Bilinmeyen Kanal');
			
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

async function generateDetailedStatsCanvas(client, member, guild) {
	const stats = await statsUtilsHandler.getUserStats(member.id, guild.id);
	
	if (!stats) return null;

	const width = 1400;
	const height = 720;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#0f0f0f';
	ctx.fillRect(0, 0, width, height);

	const profileY = 70;
	
	try {
		const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
		const avatar = await loadImage(avatarURL);
		
		ctx.save();
		ctx.beginPath();
		ctx.arc(90, profileY, 50, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatar, 40, profileY - 50, 100, 100);
		ctx.restore();
	} catch {}

	ctx.font = 'bold 28px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	ctx.fillText(member.user.displayName || member.user.username, 160, profileY - 5);

	ctx.font = '18px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(`${stats?.days || 0} günlük veri`, 160, profileY + 20);

	ctx.font = 'bold 32px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('Detaylı İstatistikler', width / 2, profileY - 5);

	ctx.font = 'bold 18px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(guild.name, width / 2, profileY + 20);

	const categoryWidth = 620;
	const gapX = 30;
	const totalGridWidth = (categoryWidth * 2) + gapX;
	const startX = (width - totalGridWidth) / 2;
	const marginY = 165;

	const topMessageChannels = stats?.topMessageChannels?.slice(0, 6) || [];
	const x1 = startX;
	const y = marginY;

	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	ctx.fillText('EN AKTIF OLDUGU MESAJ KANALLARI', x1, y);

	for (let j = 0; j < 6; j++) {
		const itemY = y + 30 + (j * 77);
		const channelData = topMessageChannels[j];

		drawRoundedRect(ctx, x1, itemY, categoryWidth, 62, 10, '#2a2a2a');

		if (channelData) {
			const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#FF8C00', '#A9A9A9', '#D2691E'];
			
			const channel = guild.channels.cache.get(channelData.channelId);
			// Önce Discord'dan al, yoksa veritabanından
			let channelName = channel ? `#${channel.name}` : (channelData.channelName ? `#${channelData.channelName}` : 'Bilinmeyen Kanal');
			
			if (channelName.length > 30) {
				channelName = channelName.substring(0, 27) + '...';
			}

			ctx.font = 'bold 22px sans-serif';
			ctx.fillStyle = '#ffffff';
			ctx.textAlign = 'left';
			ctx.fillText(channelName, x1 + 20, itemY + 26);
			
			const valueText = `${channelData.count.toLocaleString('tr-TR')} mesaj`;

			ctx.font = '17px sans-serif';
			ctx.fillStyle = '#888888';
			ctx.fillText(valueText, x1 + 20, itemY + 47);
			
			ctx.font = 'bold 40px sans-serif';
			ctx.fillStyle = rankColors[j];
			ctx.textAlign = 'right';
			ctx.fillText(`#${j + 1}`, x1 + categoryWidth - 20, itemY + 40);
		} else {
			ctx.font = '18px sans-serif';
			ctx.fillStyle = '#555555';
			ctx.textAlign = 'center';
			ctx.fillText('Veri yok', x1 + categoryWidth / 2, itemY + 32);
		}
	}

	const topVoiceChannels = stats?.topVoiceChannels?.slice(0, 6) || [];
	const x2 = startX + categoryWidth + gapX;

	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	ctx.fillText('EN AKTIF OLDUGU SES KANALLARI', x2, y);

	for (let j = 0; j < 6; j++) {
		const itemY = y + 30 + (j * 77);
		const channelData = topVoiceChannels[j];

		drawRoundedRect(ctx, x2, itemY, categoryWidth, 62, 10, '#2a2a2a');

		if (channelData) {
			const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#FF8C00', '#A9A9A9', '#D2691E'];
			
			const channel = guild.channels.cache.get(channelData.id);
			// Önce Discord'dan al, yoksa veritabanından
			let channelName = channel ? channel.name : (channelData.channelName ? channelData.channelName : 'Bilinmeyen Kanal');
			
			if (channelName.length > 30) {
				channelName = channelName.substring(0, 27) + '...';
			}

			ctx.font = 'bold 22px sans-serif';
			ctx.fillStyle = '#ffffff';
			ctx.textAlign = 'left';
			ctx.fillText(channelName, x2 + 20, itemY + 26);
			
			const valueText = channelData.duration;

			ctx.font = '17px sans-serif';
			ctx.fillStyle = '#888888';
			ctx.fillText(valueText, x2 + 20, itemY + 47);
			
			ctx.font = 'bold 40px sans-serif';
			ctx.fillStyle = rankColors[j];
			ctx.textAlign = 'right';
			ctx.fillText(`#${j + 1}`, x2 + categoryWidth - 20, itemY + 40);
		} else {
			ctx.font = '18px sans-serif';
			ctx.fillStyle = '#555555';
			ctx.textAlign = 'center';
			ctx.fillText('Veri yok', x2 + categoryWidth / 2, itemY + 32);
		}
	}

	return await canvas.encode('png');
}




async function generateLevelInviteStatsCanvas(client, member, guild) {
	const levelData = await Level.findOne({ userId: member.id, guildId: guild.id });
	const inviteData = await InviteModel.findOne({ userId: member.id, guildId: guild.id });
	
	if (!levelData && !inviteData) return null;

	const width = 1400;
	const height = 720;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#0f0f0f';
	ctx.fillRect(0, 0, width, height);

	const profileY = 70;
	
	try {
		const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
		const avatar = await loadImage(avatarURL);
		
		ctx.save();
		ctx.beginPath();
		ctx.arc(90, profileY, 50, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatar, 40, profileY - 50, 100, 100);
		ctx.restore();
	} catch {}

	ctx.font = 'bold 28px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	ctx.fillText(member.user.displayName || member.user.username, 160, profileY - 5);

	ctx.font = 'bold 32px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('Level & Davet İstatistikleri', width / 2, profileY - 5);

	ctx.font = 'bold 18px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(guild.name, width / 2, profileY + 20);

	const categoryWidth = 620;
	const gapX = 30;
	const totalGridWidth = (categoryWidth * 2) + gapX;
	const startX = (width - totalGridWidth) / 2;
	const marginY = 165;

	const x1 = startX;
	const y = marginY;

	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	ctx.fillText('LEVEL BILGILERI', x1, y);

	const levelStats = [
		{ label: 'Mesaj XP', value: `${levelData?.messageXP?.toLocaleString('tr-TR') || 0} XP` },
		{ label: 'Mesaj Level', value: `Seviye ${levelData?.messageLevel || 0}` },
		{ label: 'Ses XP', value: `${levelData?.voiceXP?.toLocaleString('tr-TR') || 0} XP` },
		{ label: 'Ses Level', value: `Seviye ${levelData?.voiceLevel || 0}` },
		{ label: 'Yayın Sayısı', value: `${levelData?.totalStreams?.toLocaleString('tr-TR') || 0} yayın` },
		{ label: 'Kamera Açma', value: `${levelData?.totalCameraOpens?.toLocaleString('tr-TR') || 0} kamera` }
	];

	levelStats.forEach((item, i) => {
		const itemY = y + 30 + (i * 77);
		drawRoundedRect(ctx, x1, itemY, categoryWidth, 62, 10, '#2a2a2a');
		
		ctx.font = 'bold 22px sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.fillText(item.label, x1 + 20, itemY + 26);
		
		ctx.font = '17px sans-serif';
		ctx.fillStyle = '#888888';
		ctx.fillText(item.value, x1 + 20, itemY + 47);
	});

	const x2 = startX + categoryWidth + gapX;

	ctx.font = 'bold 20px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	ctx.fillText('DAVET BILGILERI', x2, y);

	const allInvites = await InviteModel.find({ guildId: guild.id }).sort({ invitesCount: -1 });
	const inviteRank = allInvites.findIndex(u => u.userId === member.id) + 1;

	const inviteStats = [
		{ label: 'Davet Sırası', value: inviteRank > 0 ? `#${inviteRank}` : 'Sıralama Yok', isRank: true },
		{ label: 'Toplam Davet', value: `${inviteData?.invitesCount?.toLocaleString('tr-TR') || 0} davet`, isRank: false }
	];

	inviteStats.forEach((item, i) => {
		const itemY = y + 30 + (i * 77);
		drawRoundedRect(ctx, x2, itemY, categoryWidth, 62, 10, '#2a2a2a');
		
		ctx.font = 'bold 22px sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.fillText(item.label, x2 + 20, itemY + 26);
		
		if (item.isRank && inviteRank > 0) {
			let rankColor = '#888888';
			if (inviteRank === 1) rankColor = '#FFD700';
			else if (inviteRank === 2) rankColor = '#C0C0C0';
			else if (inviteRank === 3) rankColor = '#CD7F32';
			else if (inviteRank === 4) rankColor = '#FF8C00';
			else if (inviteRank === 5) rankColor = '#A9A9A9';
			else if (inviteRank === 6) rankColor = '#D2691E';
			
			ctx.font = 'bold 24px sans-serif';
			ctx.fillStyle = rankColor;
		} else {
			ctx.font = '17px sans-serif';
			ctx.fillStyle = '#888888';
		}
		
		ctx.fillText(item.value, x2 + 20, itemY + 47);
	});

	for (let i = 2; i < 6; i++) {
		const itemY = y + 30 + (i * 77);
		drawRoundedRect(ctx, x2, itemY, categoryWidth, 62, 10, '#2a2a2a');
		
		ctx.font = '18px sans-serif';
		ctx.fillStyle = '#555555';
		ctx.textAlign = 'center';
		ctx.fillText('', x2 + categoryWidth / 2, itemY + 32);
	}

	return await canvas.encode('png');
}
