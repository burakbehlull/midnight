import Manager from '#managers';

export default {
    name: "fuck",
    usage: "fuck @kullanıcı",
    aliases: ["sik"],
    description: 'Birine müstehcen şeyler yap',
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
            return manager.sender.reply(manager.sender.errorEmbed("❌ Kendini fuck edemezsin!"));
        }

        const gifs = [
            'https://media.tenor.com/VCnLtQHbbA8AAAAC/anime-hentai.gif',
            'https://media.tenor.com/3-s96CxFKEEAAAAC/anime-lewd.gif',
            'https://media.tenor.com/WUu26CZKg34AAAAC/anime-kiss.gif',
            'https://media.tenor.com/oyArU-831j0AAAAC/anime-hug.gif',
            'https://media.tenor.com/GvB7Z5v_5tcAAAAC/anime.gif'
        ];

        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

        message.reply({ 
            content: `**${message.author.username}**, **${target.user.username}** kullanıcısına müstehcen şeyler yapıyor ;o`,
            embeds: [{
                image: { url: randomGif },
                color: 0xFF0000
            }]
        });
    }
};
