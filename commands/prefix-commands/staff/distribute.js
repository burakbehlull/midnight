import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';


export default {
    name: 'dağıt',
	description: 'Sesteki tüm kullanıcıları dağıtır.',
	aliases: ["distribute", "dagit"],
	cooldown: 5,
	usage: '.dağıt',
	category: 'moderation',
    permissions: {
        authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
    },

    async execute(client, message) {
        const voiceChannel = message.member.voice.channel;
		
		const sender = new Manager(client, { action: message }).sender;
		
        if (!voiceChannel) return sender.reply(sender.errorEmbed('Önce bir ses kanalına gir!'));

        const members = [...voiceChannel.members.values()];
        const channels = message.guild.channels.cache.filter(c => c.type === 2 && c.id !== voiceChannel.id);
        let i = 0;
        members.forEach(member => {
            const target = [...channels.values()][i % channels.size];
            member.voice.setChannel(target);
            i++;
        });
		
		let IEmbed = sender.classic('Kullanıcılar dağıtıldı.')
        message.channel.send({embeds: [IEmbed]});
    }
};
