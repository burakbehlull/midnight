import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: "kilit",
	aliases: ["lock"],
	usage: "kilit <aç>",
	category: 'moderation',
	permissions: {
		authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
	},
	
    async execute(client, message, args) {
        const channel = message.channel;
		
		const sender = new Manager(client, { action: message }).sender;
		
		const choose = args[0]
		const permissions = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
		
		const isLock = permissions.deny.has(PM.flags.SendMessages);
		
		if(isLock){
			if (!permissions.deny.has(PM.flags.SendMessages)) return sender.reply(sender.errorEmbed('❌ Kanal kilitlenmemiş!'));
			
			await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
				SendMessages: true
			})
			let IEmbed = sender.classic("Kanal kilidi açıldı!")
			return message.channel.send({embeds: [IEmbed]});
		}
		
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: false
        });
		let IEmbed = sender.classic("🔒 Kanal kilitlendi!")
        message.channel.send({embeds: [IEmbed]});
    }
};
