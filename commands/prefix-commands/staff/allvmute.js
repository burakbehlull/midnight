import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'allvmute',
	usage: 'allvmute #VoiceChannel',
	aliases: ["hepsini-mutele"],
	category: 'moderation',

    permissions: {
        authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
    },

    async execute(client, message, args) {
		const manager = new Manager(client, { action: message });
	
		
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        if (!channel || channel.type !== 2) return manager.sender.reply(manager.sender.errorEmbed('Geçerli bir ses kanalı belirtmelisin.'));
        channel.members.forEach(member => {
            if (member.id !== message.author.id) {
                member.voice.setMute(true).catch(() => {});
            }
        });
		const IEmbed = manager.sender.classic('Kanal sessize alındı.')
        message.channel.send({embeds: [IEmbed]});
    }
};
