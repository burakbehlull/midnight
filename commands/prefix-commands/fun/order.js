import Manager from '#managers';
import { Economy } from '#models';

export default {
    name: "order",
    usage: "order <kahve | çay> @kullanıcı",
    aliases: ["ısmarla"],
    description: 'Birine kahve veya çay ısmarla (10 coin)',
    category: "fun",
    
    permissions: {
        enabled: false
    },

    execute: async (client, message, args) => {
        const manager = new Manager(client, { action: message });
        
        if (!args[0]) {
            return manager.sender.reply(manager.sender.errorEmbed("❌ Kullanım: `.order <kahve | çay> @kullanıcı`"));
        }

        const drinkType = args[0].toLowerCase();
        
        if (!['kahve', 'çay', 'coffee', 'tea'].includes(drinkType)) {
            return manager.sender.reply(manager.sender.errorEmbed("❌ Sadece **kahve** veya **çay** ısmarlayabilirsin!"));
        }

        const target = message.mentions.members.first() || 
                       message.guild.members.cache.get(args[1]);
        
        if (!target) {
            return manager.sender.reply(manager.sender.errorEmbed("❌ Bir kullanıcı etiketle!"));
        }

        if (target.id === message.author.id) {
            return manager.sender.reply(manager.sender.errorEmbed("❌ Kendine ısmarlayamazsın!"));
        }

        const authorData = await Economy.findOne({ userId: message.author.id }) || 
                           new Economy({ userId: message.author.id });

        if (authorData.money < 10) {
            return manager.sender.reply(manager.sender.errorEmbed("❌ Yeterli paran yok! (Gereken: 10 💰)"));
        }

        authorData.money -= 10;
        await authorData.save();

        let drinkName, drinkEmoji, gif;
        
        if (['kahve', 'coffee'].includes(drinkType)) {
            drinkName = 'kahve';
            drinkEmoji = '☕';
            const coffeeGifs = [
                'https://media.tenor.com/wXs4e-iiLpcAAAAC/anime-coffee.gif',
                'https://media.tenor.com/jZOt8IqNGxUAAAAC/anime-coffe.gif',
                'https://media.tenor.com/TvHnjoF0kp0AAAAC/anime-coffee.gif',
                'https://media.tenor.com/EcZvV7sdjLYAAAAC/coffee-anime.gif',
                'https://media.tenor.com/pLd8vY5GXYYAAAAC/anime-girl.gif'
            ];
            gif = coffeeGifs[Math.floor(Math.random() * coffeeGifs.length)];
        } else {
            drinkName = 'çay';
            drinkEmoji = '🍵';
            const teaGifs = [
                'https://media.tenor.com/YnFzADN_WKAAAAAC/anime-tea.gif',
                'https://media.tenor.com/8T6T8K8r0SkAAAAC/anime-tea.gif',
                'https://media.tenor.com/U7w0Z5dJEfEAAAAC/anime-girl.gif',
                'https://media.tenor.com/KJhDlqNpLu4AAAAC/anime-tea.gif',
                'https://media.tenor.com/fzB8vY3qTcQAAAAC/anime-drinking.gif'
            ];
            gif = teaGifs[Math.floor(Math.random() * teaGifs.length)];
        }

        message.reply({ 
            content: `${drinkEmoji} **${message.author.username}**, **${target.user.username}** kullanıcısına ${drinkName} ısmarladı!\n💰 **-10 coin**`,
            embeds: [{
                image: { url: gif },
                color: drinkType === 'kahve' || drinkType === 'coffee' ? 0x6F4E37 : 0x90EE90
            }]
        });
    }
};
