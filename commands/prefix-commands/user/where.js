import Manager from '#managers';
import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
    name: 'where',
    description: 'Sesteki kullanıcıların hangi kanalda olduğunu gösterir.',
    aliases: ["nerede"],
    usage: '.where',
    category: 'user',
    permissions: {
		enabled: false
	},

    async execute(client, message) {

        const manager = new Manager(client, { action: message });

        const target = message.mentions.members?.first() 

        if (!target) return manager.sender.reply(manager.sender.errorEmbed('Lütfen bir kullanıcı etiketleyin.'));

        const voice = target.voice.channel;

        if (!voice) return manager.sender.reply(manager.sender.errorEmbed('Kullanıcı herhangi bir ses kanalında değil.'));

        let embed = manager.sender.classic(`
            Kullanıcı: **${target.user.globalName ?? ""} (${target.user.username})**\n
            **Kanal:** <#${voice.id}> (${voice.name})\n
            **Susturulmuş:** ${target.voice.mute ? 'Evet' : 'Hayır'}\n
            **Sağırlaştırılmış:** ${target.voice.deaf ? 'Evet' : 'Hayır'}\n
            **Yayın:** ${target.voice.streaming ? 'Evet' : 'Hayır'}\n
            **Kamera:** ${target.voice.selfVideo ? 'Evet' : 'Hayır'}
        `)

        const IEmbed = new EmbedBuilder(embed).setThumbnail(target.user.displayAvatarURL({ dynamic: true }))

        message.channel.send({embeds: [IEmbed]});
    }
};
