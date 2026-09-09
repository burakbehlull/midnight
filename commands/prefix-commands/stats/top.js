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

async function generateStatTopCanvas(client, guild) {
	const topMessages = await statsUtilsHandler.getTopMessageUsers(guild.id);
	const topVoices = await statsUtilsHandler.getTopVoiceUsers(guild.id);
	const topCameras = await statsUtilsHandler.getTopCameraUsers(guild.id);
	const topStreams = await statsUtilsHandler.getTopStreamUsers(guild.id);

	const width = 1400;
	const height = 720;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#0f0f0f';
	ctx.fillRect(0, 0, width, height);

	ctx.font = 'bold 32px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('Genel İstatistikler', width / 2, 50);

	ctx.font = 'bold 18px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(guild.name, width / 2, 85);

	const categoryWidth = 620;
	const categoryHeight = 260;
	const gapX = 30;
	const totalGridWidth = (categoryWidth * 2) + gapX;
	const startX = (width - totalGridWidth) / 2;
	const marginY = 120;
	const gapY = 40;

	const categories = [
		{ title: 'EN ÇOK SESTE DURANLAR', data: topVoices.slice(0, 3), type: 'voice' },
		{ title: 'EN ÇOK MESAJ ATANLAR', data: topMessages.slice(0, 3), type: 'message' },
		{ title: 'EN ÇOK KAMERA AÇANLAR', data: topCameras.slice(0, 3), type: 'camera' },
		{ title: 'EN ÇOK YAYIN AÇANLAR', data: topStreams.slice(0, 3), type: 'stream' }
	];

	for (let i = 0; i < 4; i++) {
		const row = Math.floor(i / 2);
		const col = i % 2;
		const x = startX + (col * (categoryWidth + gapX));
		const y = marginY + (row * (categoryHeight + gapY));
		
		const category = categories[i];

		ctx.font = 'bold 20px sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.fillText(category.title, x, y);

		for (let j = 0; j < 3; j++) {
			const itemY = y + 30 + (j * 77);
			const user = category.data[j];

			drawRoundedRect(ctx, x, itemY, categoryWidth, 62, 10, '#2a2a2a');

			if (user) {
				const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
				
				try {
					const discordUser = await client.users.fetch(user.userId).catch(() => null);
					
					if (discordUser) {
						try {
							const avatarURL = discordUser.displayAvatarURL({ extension: 'png', size: 128 });
							const avatar = await loadImage(avatarURL);
							
							ctx.save();
							ctx.beginPath();
							ctx.arc(x + 38, itemY + 31, 24, 0, Math.PI * 2);
							ctx.closePath();
							ctx.clip();
							ctx.drawImage(avatar, x + 14, itemY + 7, 48, 48);
							ctx.restore();
						} catch {
							ctx.beginPath();
							ctx.arc(x + 38, itemY + 31, 24, 0, Math.PI * 2);
							ctx.fillStyle = '#444444';
							ctx.fill();
						}
					}
					
					let username = discordUser ? discordUser.username : 'Bilinmeyen';
					
					if (username.length > 16) {
						username = username.substring(0, 13) + '...';
					}

					ctx.font = 'bold 22px sans-serif';
					ctx.fillStyle = '#ffffff';
					ctx.textAlign = 'left';
					ctx.fillText(username, x + 75, itemY + 26);
					
					let valueText = '';
					if (category.type === 'voice') {
						valueText = statsUtilsHandler.formatDuration(user.totalVoice);
					} else if (category.type === 'message') {
						valueText = `${user.totalMessages.toLocaleString('tr-TR')} mesaj`;
					} else if (category.type === 'camera') {
						valueText = `${user.totalCameraOpens.toLocaleString('tr-TR')} kamera`;
					} else if (category.type === 'stream') {
						valueText = `${user.totalStreams.toLocaleString('tr-TR')} yayın`;
					}

					ctx.font = '17px sans-serif';
					ctx.fillStyle = '#888888';
					ctx.fillText(valueText, x + 75, itemY + 47);
					
				} catch {
					ctx.font = 'bold 22px sans-serif';
					ctx.fillStyle = '#ffffff';
					ctx.textAlign = 'left';
					ctx.fillText('Kullanıcı', x + 75, itemY + 34);
				}
				
				ctx.font = 'bold 40px sans-serif';
				ctx.fillStyle = rankColors[j];
				ctx.textAlign = 'right';
				ctx.fillText(`#${j + 1}`, x + categoryWidth - 20, itemY + 40);
			} else {
				ctx.font = '18px sans-serif';
				ctx.fillStyle = '#555555';
				ctx.textAlign = 'center';
				ctx.fillText('Veri yok', x + categoryWidth / 2, itemY + 32);
			}
		}
	}

	return await canvas.encode('png');
}

async function generateLevelTopCanvas(client, guild) {
	const topMessageLevel = await Level.find({ guildId: guild.id }).sort({ messageLevel: -1 }).limit(3);
	const topVoiceLevel = await Level.find({ guildId: guild.id }).sort({ voiceLevel: -1 }).limit(3);

	const width = 1400;
	const height = 720;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#0f0f0f';
	ctx.fillRect(0, 0, width, height);

	ctx.font = 'bold 32px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('Seviye Sıralaması', width / 2, 50);

	ctx.font = 'bold 18px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(guild.name, width / 2, 85);

	const categoryWidth = 620;
	const categoryHeight = 260;
	const gapX = 30;
	const totalGridWidth = (categoryWidth * 2) + gapX;
	const startX = (width - totalGridWidth) / 2;
	const marginY = 120;

	const categories = [
		{ title: 'MESAJ SEVİYE SIRALAMASI', data: topMessageLevel, type: 'messageLevel' },
		{ title: 'SES SEVİYE SIRALAMASI', data: topVoiceLevel, type: 'voiceLevel' }
	];

	for (let i = 0; i < 2; i++) {
		const x = startX + (i * (categoryWidth + gapX));
		const y = marginY;
		
		const category = categories[i];

		ctx.font = 'bold 20px sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.fillText(category.title, x, y);

		for (let j = 0; j < 3; j++) {
			const itemY = y + 30 + (j * 77);
			const user = category.data[j];

			drawRoundedRect(ctx, x, itemY, categoryWidth, 62, 10, '#2a2a2a');

			if (user) {
				const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
				
				try {
					const discordUser = await client.users.fetch(user.userId).catch(() => null);
					
					if (discordUser) {
						try {
							const avatarURL = discordUser.displayAvatarURL({ extension: 'png', size: 128 });
							const avatar = await loadImage(avatarURL);
							
							ctx.save();
							ctx.beginPath();
							ctx.arc(x + 38, itemY + 31, 24, 0, Math.PI * 2);
							ctx.closePath();
							ctx.clip();
							ctx.drawImage(avatar, x + 14, itemY + 7, 48, 48);
							ctx.restore();
						} catch {
							ctx.beginPath();
							ctx.arc(x + 38, itemY + 31, 24, 0, Math.PI * 2);
							ctx.fillStyle = '#444444';
							ctx.fill();
						}
					}
					
					let username = discordUser ? discordUser.username : 'Bilinmeyen';
					
					if (username.length > 16) {
						username = username.substring(0, 13) + '...';
					}

					ctx.font = 'bold 22px sans-serif';
					ctx.fillStyle = '#ffffff';
					ctx.textAlign = 'left';
					ctx.fillText(username, x + 75, itemY + 26);
					
					let valueText = '';
					if (category.type === 'messageLevel') {
						valueText = `Seviye ${user.messageLevel} - ${user.messageXP.toLocaleString('tr-TR')} XP`;
					} else if (category.type === 'voiceLevel') {
						valueText = `Seviye ${user.voiceLevel} - ${user.voiceXP.toLocaleString('tr-TR')} XP`;
					}

					ctx.font = '17px sans-serif';
					ctx.fillStyle = '#888888';
					ctx.fillText(valueText, x + 75, itemY + 47);
					
				} catch {
					ctx.font = 'bold 22px sans-serif';
					ctx.fillStyle = '#ffffff';
					ctx.textAlign = 'left';
					ctx.fillText('Kullanıcı', x + 75, itemY + 34);
				}
				
				ctx.font = 'bold 40px sans-serif';
				ctx.fillStyle = rankColors[j];
				ctx.textAlign = 'right';
				ctx.fillText(`#${j + 1}`, x + categoryWidth - 20, itemY + 40);
			} else {
				ctx.font = '18px sans-serif';
				ctx.fillStyle = '#555555';
				ctx.textAlign = 'center';
				ctx.fillText('Veri yok', x + categoryWidth / 2, itemY + 32);
			}
		}
	}

	return await canvas.encode('png');
}

async function generateInviteTopCanvas(client, guild) {
	const topInvites = await InviteModel.find({ guildId: guild.id }).sort({ invitesCount: -1 }).limit(8);

	const width = 1400;
	const height = 960;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#0f0f0f';
	ctx.fillRect(0, 0, width, height);

	ctx.font = 'bold 32px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('Davet Sıralaması', width / 2, 50);

	ctx.font = 'bold 18px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(guild.name, width / 2, 85);

	const categoryWidth = 620;
	const gapX = 30;
	const totalGridWidth = (categoryWidth * 2) + gapX;
	const startX = (width - totalGridWidth) / 2;
	const marginY = 120;

	const categories = [
		{ title: 'EN ÇOK DAVET EDENLER (#1-4)', data: topInvites.slice(0, 4) },
		{ title: 'EN ÇOK DAVET EDENLER (#5-8)', data: topInvites.slice(4, 8) }
	];

	for (let catIndex = 0; catIndex < 2; catIndex++) {
		const x = startX + (catIndex * (categoryWidth + gapX));
		const y = marginY;
		
		const category = categories[catIndex];

		ctx.font = 'bold 20px sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.fillText(category.title, x, y);

		for (let j = 0; j < 4; j++) {
			const itemY = y + 30 + (j * 77);
			const user = category.data[j];
			const actualRank = catIndex * 4 + j;

			drawRoundedRect(ctx, x, itemY, categoryWidth, 62, 10, '#2a2a2a');

			if (user) {
				const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#8B4513', '#708090', '#A0522D', '#696969', '#4B4B4B'];
				
				try {
					const discordUser = await client.users.fetch(user.userId).catch(() => null);
					
					if (discordUser) {
						try {
							const avatarURL = discordUser.displayAvatarURL({ extension: 'png', size: 128 });
							const avatar = await loadImage(avatarURL);
							
							ctx.save();
							ctx.beginPath();
							ctx.arc(x + 38, itemY + 31, 24, 0, Math.PI * 2);
							ctx.closePath();
							ctx.clip();
							ctx.drawImage(avatar, x + 14, itemY + 7, 48, 48);
							ctx.restore();
						} catch {
							ctx.beginPath();
							ctx.arc(x + 38, itemY + 31, 24, 0, Math.PI * 2);
							ctx.fillStyle = '#444444';
							ctx.fill();
						}
					}
					
					let username = discordUser ? discordUser.username : 'Bilinmeyen';
					
					if (username.length > 16) {
						username = username.substring(0, 13) + '...';
					}

					ctx.font = 'bold 22px sans-serif';
					ctx.fillStyle = '#ffffff';
					ctx.textAlign = 'left';
					ctx.fillText(username, x + 75, itemY + 26);
					
					const valueText = `${user.invitesCount.toLocaleString('tr-TR')} davet`;

					ctx.font = '17px sans-serif';
					ctx.fillStyle = '#888888';
					ctx.fillText(valueText, x + 75, itemY + 47);
					
				} catch {
					ctx.font = 'bold 22px sans-serif';
					ctx.fillStyle = '#ffffff';
					ctx.textAlign = 'left';
					ctx.fillText('Kullanıcı', x + 75, itemY + 34);
				}
				
				ctx.font = 'bold 40px sans-serif';
				ctx.fillStyle = rankColors[actualRank];
				ctx.textAlign = 'right';
				ctx.fillText(`#${actualRank + 1}`, x + categoryWidth - 20, itemY + 40);
			} else {
				ctx.font = '18px sans-serif';
				ctx.fillStyle = '#555555';
				ctx.textAlign = 'center';
				ctx.fillText('Veri yok', x + categoryWidth / 2, itemY + 32);
			}
		}
	}

	return await canvas.encode('png');
}

export default {
	name: 'top',
	description: 'Genel sıralama menüsünü gösterir',
	usage: 'top',
	category: 'stats',

	permissions: {
		enabled: false
	},

	async execute(client, message) {
		const manager = new Manager(client, { action: message });

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('top_menu')
			.setPlaceholder('Bir kategori seçin')
			.addOptions([
				{
					label: 'Genel İstatistik Sıralaması',
					description: 'Ses, mesaj, kamera ve yayın istatistikleri',
					value: 'top_stat'
				},
				{
					label: 'Genel Seviye Sıralaması',
					description: 'XP ve seviye sıralamaları',
					value: 'top_level'
				},
				{
					label: 'Genel İnvite Sıralaması',
					description: 'Davet istatistikleri',
					value: 'top_invite'
				}
			]);

		const row = new ActionRowBuilder().addComponents(selectMenu);

		const embed = manager.sender.embed({
			title: 'Genel Sıralama Menüsü',
			description: 'Aşağıdaki menüden görmek istediğiniz sıralamayı seçin:',
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

				if (selected === 'top_stat') {
					buffer = await generateStatTopCanvas(client, message.guild);
					filename = 'stat-top.png';
				} else if (selected === 'top_level') {
					buffer = await generateLevelTopCanvas(client, message.guild);
					filename = 'level-top.png';
				} else if (selected === 'top_invite') {
					buffer = await generateInviteTopCanvas(client, message.guild);
					filename = 'invite-top.png';
				}

				await interaction.followUp({
					files: [{
						attachment: buffer,
						name: filename
					}]
				});
			} catch (error) {
				console.error('Canvas generation error:', error);
				await interaction.followUp({
					content: 'Sıralama oluşturulurken bir hata oluştu.',
					flags: 64
				});
			}
		});

		collector.on('end', () => {
			reply.edit({ components: [] }).catch(() => {});
		});
	}
};
