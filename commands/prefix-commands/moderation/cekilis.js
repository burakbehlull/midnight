import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import ms from 'ms';

import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

function formatTimeLeft(msTime) {
    const seconds = Math.max(1, Math.floor(msTime / 1000));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const future = new Date(Date.now() + msTime);
    const saat = future.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const tarih = future.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    let relative;
    if (seconds <= 60) {
        relative = `${seconds} saniye kaldı`;
    } else if (minutes < 60) {
        relative = `${minutes} dakika kaldı`;
    } else {
        relative = `${hours} saat${minutes % 60 > 0 ? ` ${minutes % 60} dakika` : ''} kaldı`;
    }

    return {
        relative,
        exact: `${tarih} ${saat}`,
        shortTime: `bugün saat ${saat}`
    };
}

export default {
    name: "çekiliş",
    aliases: ["gstart", "giveaway"],
    description: "Belirttiğin süreyle çekiliş başlatır.",
    usage: ".çekiliş <süre> <kazanan_sayısı> <ödül>",
	category: 'extra',
	

    execute: async (client, message, args) => {
		const sender = new messageSender(message)
        
		const PM = new PermissionsManager(message);
      
		const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator);
		if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));


        const time = args[0];
        const winnerCount = parseInt(args[1]);
        const prize = args.slice(2).join(" ");

        if (!time || isNaN(winnerCount) || !prize) return sender.reply(sender.errorEmbed("Kullanım: `.çekiliş <süre> <kazanan_sayısı> <ödül>`\nÖrnek: `.çekiliş 1h 2 Discord Nitro`"));
        

        const duration = ms(time);
        if (!duration) return sender.reply(sender.errorEmbed("❌ Geçerli bir süre belirtmelisin!"));

        const startTimestamp = Date.now();
        const endTimestamp = startTimestamp + duration;

        const initialTime = formatTimeLeft(duration);

        let embed = sender.embed({
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

                    const timeInfo = formatTimeLeft(timeLeft);
                    embed.spliceFields(0, 1, {
                        name: "Bitiş:",
                        value: `**${timeInfo.relative}** (${timeInfo.exact})`,
                        inline: false
                    });
                    await giveawayMessage?.edit({ embeds: [embed] });
                }, 1000);
            } else {
                const timeInfo = formatTimeLeft(timeLeft);
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
				const IEmbedError = sender.errorEmbed("❌ Yeterli katılımcı yok, çekiliş iptal edildi.")
                return message.channel.send({embeds: [IEmbedError]});
            }

            const winners = [];
            for (let i = 0; i < Math.min(winnerCount, validUsers.length); i++) {
                const winner = validUsers.splice(Math.floor(Math.random() * validUsers.length), 1)[0];
                winners.push(`<@${winner}>`);
            }

            const resultEmbed = sender.embed({
				color: "#43B581",
				title: "🎉 Çekiliş Sonuçlandı!",
				description: `**Ödül:** ${prize}\n**Kazananlar:** ${winners.join(", ")}\n`
			})

            message.channel.send({ embeds: [resultEmbed] });
        }, duration);
    }
};
