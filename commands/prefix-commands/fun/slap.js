import Manager from '#managers';

export default {
    name: "slap",
    usage: "slap @kullanıcı",
    aliases: ["şaplak", "tokat"],
    description: 'Birine tokat at',
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
            return manager.sender.reply(manager.sender.errorEmbed("❌ Kendine tokat atamazsın!"));
        }

        const gifs = [
            'https://cdn.discordapp.com/attachments/948696953695383643/1549388572832825344/792e3d12af444957a678b29363b619b3.gif?ex=6aaa840e&is=6aa9328e&hm=5d53e1b3cd8431420ac03b02ef7581d3d860f9df2c4a7969f07774849134c6d3&=&width=400&height=225',
        ];

        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

        message.reply({ 
            content: `**${message.author.username}**, **${target.user.username}** tokatladı.`,
            embeds: [{
                image: { url: randomGif },
                color: 0xFFA500
            }]
        });
    }
};
