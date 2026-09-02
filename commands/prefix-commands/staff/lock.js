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
		
		const manager = new Manager(client, { action: message })
		
		const permissions = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
		
		const isLock = permissions.deny.has(manager.flags.SendMessages);
		
		if(isLock){
			if (!permissions.deny.has(manager.flags.SendMessages)) return manager.reply(manager.sender.errorEmbed('❌ Kanal kilitlenmemiş!'));
			
			await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
				SendMessages: true
			})
			let IEmbed = manager.sender.classic("Kanal kilidi açıldı!")
			return message.channel.send({embeds: [IEmbed]});
		}
		
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: false
        });
		let IEmbed = manager.sender.classic("🔒 Kanal kilitlendi!")
        message.channel.send({embeds: [IEmbed]});
    }
};
