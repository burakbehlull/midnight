import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: "kilit",
	aliases: ["lock"],
	usage: "kilit",
	category: 'moderation',
	permissions: {
		authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
	},
	
    async execute(client, message) {
        const channel = message.channel;
		
		const manager = new Manager(client, { action: message });
		
		const everyone = message.guild.roles.everyone;
		const channelPerms = channel.permissionsFor(everyone);
		const canSend = channelPerms ? channelPerms.has(PermissionFlagsBits.SendMessages) : true;
		const isLocked = !canSend;

		if (isLocked) {
			await channel.permissionOverwrites.edit(everyone, {
				SendMessages: null
			});
			const IEmbed = manager.sender.classic("🔓 Kanal kilidi açıldı!");
			return message.channel.send({ embeds: [IEmbed] });
		}
		
        await channel.permissionOverwrites.edit(everyone, {
            SendMessages: false
        });
		const IEmbed = manager.sender.classic("🔒 Kanal kilitlendi!");
        return message.channel.send({ embeds: [IEmbed] });
    }
};
