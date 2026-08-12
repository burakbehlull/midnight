import { EmbedBuilder, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import ms from 'ms';

import Manager from '#managers';
import { misc } from '#helpers';



export default {
    name: "çekiliş",
    aliases: ["gstart", "giveaway"],
    description: "Belirttiğin süreyle çekiliş başlatır.",
    usage: ".çekiliş <süre> <kazanan_sayısı> <ödül>",
	category: 'extra',

    permissions: {
        authorities: [PermissionFlagsBits.Administrator]
    },
	

    execute: async (client, message, args) => {
	    const manager = new Manager(client, { action: message });
		

        const time = args[0];
        const winnerCount = parseInt(args[1]);
        const prize = args.slice(2).join(" ");

        if (!time || isNaN(winnerCount) || !prize) return manager.sender.reply(manager.sender.errorEmbed("Kullanım: `.çekiliş <süre> <kazanan_sayısı> <ödül>`\nÖrnek: `.çekiliş 1h 2 Discord Nitro`"));
        

        const duration = ms(time);
        if (!duration) return manager.sender.reply(manager.sender.errorEmbed("❌ Geçerli bir süre belirtmelisin!"));

        const startTimestamp = Date.now();
        const endTimestamp = startTimestamp + duration;

        const initialTime = misc.formatTimeLeft(duration);

        let embed = manager.sender.embed({
			title: "🎉 Yeni Bir Çekiliş Başladı!",
			color: "#2F3136",
			description: null,
			fields: [
				{ name: "Bitiş:", value: `**${initialTime.relative}** (${initialTime.exact})`, inline: false },
                { name: "Düzenleyen:", value: `<@${message.author.id}>`, inline: true },
                { name: "Ödül:", value: `**${prize}**`, inline: true },
                { name: "Kazanan:", value: `**${winnerCount}**`, inline: true }
			]	
		})
            

        const giveawayMessage = await message.channel.send({ embeds: [embed] });
        await giveawayMessage.react("🎉");

        let fastInterval = null;

        const normalInterval = setInterval(async () => {
            const now = Date.now();
            const timeLeft = endTimestamp - now;

            if (timeLeft <= 0) {
                clearInterval(normalInterval);
                return;
            }

            if (timeLeft <= 60 * 1000 && !fastInterval) {
                clearInterval(normalInterval);
                fastInterval = setInterval(async () => {
                    const now = Date.now();
                    const timeLeft = endTimestamp - now;

                    if (timeLeft <= 0) {
                        clearInterval(fastInterval);
                        return;
                    }

                    const timeInfo = misc.formatTimeLeft(timeLeft);
                    embed.spliceFields(0, 1, {
                        name: "Bitiş:",
                        value: `**${timeInfo.relative}** (${timeInfo.exact})`,
                        inline: false
                    });
                    await giveawayMessage?.edit({ embeds: [embed] });
                }, 1000);
            } else {
                const timeInfo = misc.formatTimeLeft(timeLeft);
                embed.spliceFields(0, 1, {
                    name: "Bitiş:",
                    value: `**${timeInfo.relative}** (${timeInfo.exact})`,
                    inline: false
                });
                await giveawayMessage?.edit({ embeds: [embed] });
            }
        }, 10_000);

        setTimeout(async () => {
            clearInterval(normalInterval);
            if (fastInterval) clearInterval(fastInterval);

            const fetched = await message.channel.messages.fetch(giveawayMessage.id).catch(() => null);
            if (!fetched) return;

            const reaction = fetched.reactions.cache.get("🎉");
            const users = await reaction.users.fetch();
            const validUsers = users.filter(u => !u.bot).map(u => u.id);

            if (validUsers.length < 1) {
				const IEmbedError = manager.sender.errorEmbed("❌ Yeterli katılımcı yok, çekiliş iptal edildi.")
                return message.channel.send({embeds: [IEmbedError]});
            }

            const winners = [];
            for (let i = 0; i < Math.min(winnerCount, validUsers.length); i++) {
                const winner = validUsers.splice(Math.floor(Math.random() * validUsers.length), 1)[0];
                winners.push(`<@${winner}>`);
            }

            const resultEmbed = manager.sender.embed({
				color: "#43B581",
				title: "🎉 Çekiliş Sonuçlandı!",
				description: `**Ödül:** ${prize}\n**Kazananlar:** ${winners.join(", ")}\n`
			})

            message.channel.send({ embeds: [resultEmbed] });
        }, duration);
    }
};
