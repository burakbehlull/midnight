import canvafy from 'canvafy'
import { messageSender } from '#helpers';
    


export default {
    name: "ship",
    usage: "ship [@miguel / ID / Random]",
    aliases: ["ships", "kalp"],
    description: 'Ship yapma komutu',
    execute: async (client, message, args) => {
		const sender = new messageSender(message);
        let user = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.guild.members.cache.random();
        if (!user) return sender.reply(sender.errorEmbed("Geçerli bir kullanıcı belirt!")).then(msg => {
            setTimeout(() => msg.delete(), 5000)
        });

        const ship = await new canvafy.Ship()
            .setAvatars(message.author.displayAvatarURL({ dynamic: true, extension: "png" }), user.user.displayAvatarURL({ dynamic: true, extension: "png" }))
            .setBackground("image", `${message.guild.bannerURL({ extension: "png", size: 2048 }) !== null ? message.guild.bannerURL({ extension: "png", size: 2048 }) : "https://i.imgur.com/sCL0QTh.png"}`)
            .setBorder("#f0f0f0")
            .setOverlayOpacity(0.5)
            .build();

        message.reply({
            content: `<@!${message.author.id}> & <@!${user.user.id}>`,
            files: [{
                attachment: ship,
                name: `ship-${message.member.id}.png`
            }]
        });
    }
};