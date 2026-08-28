import Manager from '#managers';

export default {
    name: 'server-pp',
    aliases: ['sunucu-profil'],
    description: 'Sunucunun profil resmini gösterir.',
    usage: 'server-pp',
    category: 'moderation',

    permissions: {
        enabled: false
    },

    async execute(client, message) {
        const manager = new Manager(client, { action: message });
        const avatar = message.guild.iconURL({ dynamic: true, size: 1024 });

        const IEmbed = manager.sender.classic(`**${message.guild.name}** sunucunun profili: `)
        IEmbed.setImage(avatar);

        return message.channel.send({embeds: [IEmbed]});
    }
};
