import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ComponentType, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';

import Manager from '#managers';
import { GameStat } from '#models';

const GAMES = [
	{ value: 'wordbuilding', label: 'Kelime Türetme', description: 'Yazılan kelime sayısına göre', word: true },
	{ value: 'wordgame', label: 'Kelime Oyunu', description: 'En çok kazananlar' },
	{ value: 'wordbomb', label: 'Kelime Bombası', description: 'En çok kazananlar' },
	{ value: 'xox', label: 'XOX', description: 'En çok kazananlar' },
	{ value: 'dice', label: 'Zar', description: 'En çok kazananlar' },
	{ value: 'mines', label: 'Mayın Tarlası', description: 'En çok kazananlar' },
	{ value: 'blackjack', label: 'Blackjack', description: 'En çok kazananlar' },
	{ value: 'rusruleti', label: 'Rus Ruleti', description: 'En çok kazananlar' },
	{ value: 'gofishing', label: 'Balık Tutma', description: 'En çok kazananlar' },
	{ value: 'coinflip', label: 'Yazı Tura', description: 'En çok kazananlar' },
	{ value: 'bingo', label: 'Tombala', description: 'En çok kazananlar' },
	{ value: 'slots', label: 'Slots', description: 'En çok kazananlar' },
	{ value: 'wheel', label: 'Çarkıfelek', description: 'En çok kazananlar' },
	{ value: 'keno', label: 'Keno', description: 'En çok kazananlar' },
	{ value: 'hilo', label: 'Hi-Lo', description: 'En çok kazananlar' },
	{ value: 'kazikazan', label: 'Kazı Kazan', description: 'En çok kazananlar' },
];

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

function fmt(n) {
	return Math.floor(n || 0).toLocaleString('tr-TR');
}

function isWordGame(game) {
	return GAMES.find((g) => g.value === game)?.word === true;
}

function gameLabel(game) {
	return GAMES.find((g) => g.value === game)?.label || game;
}

async function drawAvatar(ctx, url, x, y, size) {
	try {
		const avatar = await loadImage(url);
		ctx.save();
		ctx.beginPath();
		ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatar, x, y, size, size);
		ctx.restore();
		return true;
	} catch {
		ctx.beginPath();
		ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
		ctx.fillStyle = '#444444';
		ctx.fill();
		return false;
	}
}

async function generateTopCanvas(client, guild, game) {
	const wordGame = isWordGame(game);
	const sort = wordGame ? { words: -1 } : { wins: -1 };
	const filter = wordGame ? { words: { $gt: 0 } } : { wins: { $gt: 0 } };

	const docs = await GameStat.find({ guildId: guild.id, game, ...filter }).sort(sort).limit(5);

	const width = 1400;
	const height = 720;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#0f0f0f';
	ctx.fillRect(0, 0, width, height);

	ctx.font = 'bold 34px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText(`OYUN SIRALAMASI`, width / 2, 56);

	ctx.font = 'bold 22px sans-serif';
	ctx.fillStyle = '#a78bfa';
	ctx.fillText(gameLabel(game), width / 2, 92);

	ctx.font = '18px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(wordGame ? 'En çok kelime yazanlar' : 'En çok kazananlar', width / 2, 122);

	const cardWidth = 900;
	const cardX = (width - cardWidth) / 2;
	const startY = 170;
	const rowH = 88;
	const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#FF8C00', '#A9A9A9'];

	if (docs.length === 0) {
		ctx.font = '22px sans-serif';
		ctx.fillStyle = '#555555';
		ctx.textAlign = 'center';
		ctx.fillText('Henüz veri yok', width / 2, 320);
		return await canvas.encode('png');
	}

	for (let i = 0; i < docs.length; i++) {
		const doc = docs[i];
		const y = startY + i * rowH;

		drawRoundedRect(ctx, cardX, y, cardWidth, 72, 14, '#1a1a1a', rankColors[i], 2);

		const discordUser = await client.users.fetch(doc.userId).catch(() => null);
		if (discordUser) {
			await drawAvatar(
				ctx,
				discordUser.displayAvatarURL({ extension: 'png', size: 128 }),
				cardX + 18,
				y + 14,
				44
			);
		}

		let username = discordUser ? (discordUser.globalName || discordUser.username) : 'Bilinmeyen';
		if (username.length > 18) username = username.substring(0, 15) + '...';

		ctx.font = 'bold 24px sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.fillText(username, cardX + 78, y + 32);

		let valueText;
		if (wordGame) {
			valueText = `${fmt(doc.words)} kelime`;
		} else {
			valueText = `${fmt(doc.wins)} galibiyet • ${fmt(doc.plays)} maç`;
		}

		ctx.font = '17px sans-serif';
		ctx.fillStyle = '#888888';
		ctx.fillText(valueText, cardX + 78, y + 55);

		ctx.font = 'bold 40px sans-serif';
		ctx.fillStyle = rankColors[i];
		ctx.textAlign = 'right';
		ctx.fillText(`#${i + 1}`, cardX + cardWidth - 24, y + 48);
	}

	return await canvas.encode('png');
}

async function generatePersonalCanvas(client, member, guild) {
	const user = member.user ?? member;
	const docs = await GameStat.find({ guildId: guild.id, userId: user.id });
	const map = new Map(docs.map((d) => [d.game, d]));

	const width = 1400;
	const height = 940;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#0f0f0f';
	ctx.fillRect(0, 0, width, height);

	try {
		const avatarURL = user.displayAvatarURL({ extension: 'png', size: 128 });
		await drawAvatar(ctx, avatarURL, 60, 40, 100);
	} catch {}

	ctx.font = 'bold 32px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	ctx.fillText(user.displayName || user.username, 190, 78);

	ctx.font = '18px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(`${docs.length} oyunda kayıtlı veri`, 190, 108);

	ctx.font = 'bold 30px sans-serif';
	ctx.fillStyle = '#a78bfa';
	ctx.textAlign = 'center';
	ctx.fillText('OYUN İSTATİSTİKLERİM', width / 2, 60);

	ctx.font = '18px sans-serif';
	ctx.fillStyle = '#888888';
	ctx.fillText(guild.name, width / 2, 92);

	const cardWidth = 620;
	const gapX = 30;
	const totalGridWidth = cardWidth * 2 + gapX;
	const startX = (width - totalGridWidth) / 2;
	const marginY = 165;
	const cardHeight = 76;
	const cardGap = 16;

	if (docs.length === 0) {
		ctx.font = '22px sans-serif';
		ctx.fillStyle = '#555555';
		ctx.textAlign = 'center';
		ctx.fillText('Henüz hiçbir oyunda verin yok', width / 2, 320);
		return await canvas.encode('png');
	}

	for (let i = 0; i < GAMES.length; i++) {
		const col = i % 2;
		const row = Math.floor(i / 2);
		const x = startX + col * (cardWidth + gapX);
		const y = marginY + row * (cardHeight + cardGap);

		const doc = map.get(GAMES[i].value);

		drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 12, '#1a1a1a', doc ? '#2f2f2f' : '#1f1f1f', 2);

		ctx.font = 'bold 21px sans-serif';
		ctx.fillStyle = doc ? '#ffffff' : '#666666';
		ctx.textAlign = 'left';
		ctx.fillText(GAMES[i].label, x + 20, y + 30);

		let valueText;
		let valueColor = '#888888';

		if (!doc) {
			valueText = 'Veri yok';
		} else if (GAMES[i].word) {
			valueText = `${fmt(doc.words)} kelime yazdı`;
			valueColor = '#a78bfa';
		} else {
			valueText = `${fmt(doc.wins)} galibiyet • ${fmt(doc.losses)} mağlubiyet • ${fmt(doc.plays)} maç`;
			valueColor = '#a78bfa';
		}

		ctx.font = '16px sans-serif';
		ctx.fillStyle = valueColor;
		ctx.fillText(valueText, x + 20, y + 55);
	}

	return await canvas.encode('png');
}

export default {
	name: 'gamestat',
	aliases: ['oyunstat', 'gameleaderboard', 'gameleader', 'glb', 'oyunistatistik'],
	description: 'Oyun istatistiklerini ve oyun sıralamalarını gösterir',
	usage: 'gamestat',
	category: 'stats',

	permissions: {
		enabled: false
	},

	async execute(client, message) {
		const manager = new Manager(client, { action: message });

		const buildMainRow = () => new ActionRowBuilder().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('gamestat_menu')
				.setPlaceholder('Bir kategori seçin')
				.addOptions([
					{ label: 'Kişisel İstatistiklerim', description: 'Tüm oyunlardaki kendi istatistiklerin', value: 'my_stats' },
					{ label: 'Oyun Sıralaması', description: 'Seçtiğin oyunda en iyi 5 oyuncu', value: 'top_games' }
				])
		);

		const buildGameRow = () => new ActionRowBuilder().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('gamestat_game_menu')
				.setPlaceholder('Bir oyun seçin')
				.addOptions([
					...GAMES.map((g) => ({ label: g.label, description: g.description, value: `game_${g.value}` })),
					{ label: 'Geri', description: 'Ana menüye dön', value: 'back' }
				])
		);

		const mainEmbed = manager.sender.embed({
			title: 'Oyun İstatistikleri',
			description: 'Aşağıdaki menüden görmek istediğin kategoriyi seç:',
			color: 0x5865f2
		});

		const reply = await message.channel.send({
			embeds: [mainEmbed],
			components: [buildMainRow()]
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

				if (selected === 'top_games') {
					await reply.edit({
						embeds: [manager.sender.embed({
							title: 'Oyun Sıralaması',
							description: 'Sıralamasını görmek istediğin oyunu seç:',
							color: 0x5865f2
						})],
						components: [buildGameRow()]
					});
					return;
				}

				if (selected === 'back') {
					await reply.edit({ embeds: [mainEmbed], components: [buildMainRow()] });
					return;
				}

				if (selected === 'my_stats') {
					const buffer = await generatePersonalCanvas(client, message.member ?? message.author, message.guild);
					await reply.edit({
						embeds: [],
						files: [{ attachment: buffer, name: 'oyun-istatistiklerim.png' }],
						components: [buildMainRow()]
					});
					return;
				}

				if (selected.startsWith('game_')) {
					const game = selected.slice(5);
					const buffer = await generateTopCanvas(client, message.guild, game);
					await reply.edit({
						embeds: [],
						files: [{ attachment: buffer, name: `oyun-siralama-${game}.png` }],
						components: [buildGameRow()]
					});
					return;
				}
			} catch (error) {
				console.error('gamestat canvas hatası:', error);
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
