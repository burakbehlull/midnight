import Manager from '#managers';

export default {
    name: "kiss",
    usage: "kiss @kullanıcı",
    aliases: ["öp"],
    description: 'Birini öp',
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
            return manager.sender.reply(manager.sender.errorEmbed("❌ Kendini öpemezsin!"));
        }

        const gifs = [
            'https://media.tenor.com/FmeV4jZ5l7cAAAAC/anime-kiss.gif',
            'https://media.tenor.com/vtWMLqGeImMAAAAC/kiss-anime.gif',
            'https://media.tenor.com/5Y5DZ5PJqJsAAAAC/anime-kiss.gif',
            'https://media.tenor.com/T_h8H3tVZq0AAAAC/anime-kiss.gif',
            'https://media.tenor.com/02YB5hGe0HEAAAAC/anime-cute.gif'
        ];

        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

        message.reply({ 
            content: `**${message.author.username}**, **${target.user.username}** kullanıcısını öptü!`,
            embeds: [{
                image: { url: randomGif },
                color: 0xFFB6C1
            }]
        });
    }
};
