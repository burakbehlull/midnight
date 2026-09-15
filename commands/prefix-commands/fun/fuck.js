import Manager from '#managers';
import { urls } from '#data';

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

        const gifs = urls.fuck;

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
