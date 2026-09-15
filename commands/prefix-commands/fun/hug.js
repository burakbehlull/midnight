import Manager from '#managers';
import { urls } from '#data';

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

        const gifs = urls.hug;

        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

        message.reply({ 
            content: `**${message.author.username}**, **${target.user.username}** kullanıcısına sarıldı!`,
            embeds: [{
                image: { url: randomGif },
                color: 0x3498DB
            }]
        });
    }
};
