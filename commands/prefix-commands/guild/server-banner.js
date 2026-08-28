import Manager from '#managers';

export default {
    name: 'server-banner',
    aliases: ['sunucu-afis'],
    description: 'Sunucunun afişini gösterir.',
    usage: 'server-banner',
    category: 'moderation',

    permissions: {
        enabled: false
    },

    async execute(client, message) {
        const manager = new Manager(client, { action: message });
        const banner = message.guild.bannerURL({ dynamic: true, size: 1024 });

        const IEmbed = manager.sender.classic(`**${message.guild.name}** sunucunun afişi: `)
        IEmbed.setImage(banner);

        return message.channel.send({embeds: [IEmbed]});
    }
};
