import Manager from '#managers';
import { urls } from '#data';
import { gifResolver } from '#helpers';

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

        const randomGif = await gifResolver.pickRandomGif(urls.kiss);

        message.reply({ 
            content: `**${message.author.username}**, **${target.user.username}** kullanıcısını öptü!`,
            embeds: [{
                image: { url: randomGif },
                color: 0xFFB6C1
            }]
        });
    }
};
