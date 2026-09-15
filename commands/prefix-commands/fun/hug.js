import Manager from '#managers';

export default {
    name: "hug",
    usage: "hug @kullanıcı",
    aliases: ["sarıl"],
    description: 'Birine sarıl',
    category: "fun",
    
    permissions: {
        enabled: false
    },

    execute: async (client, message, args) => {
        const manager = new Manager(client, { action: message });
        
        const target = message.mentions.members.first() || 
                       message.guild.members.cache.get(args[0]);
        
        if (!target) {
            return manager.sender.reply(manager.sender.errorEmbed("❌ Bir kullanıcı etiketle!"));
        }

        if (target.id === message.author.id) {
            return manager.sender.reply(manager.sender.errorEmbed("❌ Kendine sarılamazsın!"));
        }

        const gifs = [
            'https://media.tenor.com/UoU297uD04sAAAAC/anime-hug.gif',
            'https://media.tenor.com/jMHOAt1k9S8AAAAC/hug-anime.gif',
            'https://media.tenor.com/kJZzWP2S5O0AAAAC/anime-hugs.gif',
            'https://media.tenor.com/aN6sGFu-OAoAAAAC/anime-hug.gif',
            'https://media.tenor.com/8dkk-n4SKVoAAAAC/hug.gif'
        ];

        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

        message.reply({ 
            content: `🤗 **${message.author.username}**, **${target.user.username}** kullanıcısına sarıldı!`,
            embeds: [{
                image: { url: randomGif },
                color: 0x3498DB
            }]
        });
    }
};
