import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
    name: "kilit",
	aliases: ["lock"],
	usage: "kilit <aç>",
	category: 'moderation',
	
	
    async execute(client, message, args) {
        const channel = message.channel;
		
		const sender = new messageSender(message);
		const PM = new PermissionsManager(message);
		
		const ctrl = PM.control(PM.flags.ManageChannels, PM.flags.Administrator)
		if (!ctrl) return sender.reply(sender.errorEmbed("❌ Yetkin yok."));
		
		const choose = args[0]
		const permissions = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
		
		if(choose=="aç"){
			if (!permissions.deny.has(PM.flags.SendMessages)) return sender.reply(sender.errorEmbed('❌ Kanal kilitlenmemiş!'));
			
			await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
				SendMessages: true
			})
			let IEmbed = sender.classic("Kanal kilidi açıldı!")
			return message.channel.send({embeds: [IEmbed]});
		}
		
		if (permissions.deny.has(PM.flags.SendMessages)) return sender.reply(sender.errorEmbed('❌ Bu kanal zaten kilitli.'));
		
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: false
        });
		let IEmbed = sender.classic("🔒 Kanal kilitlendi!")
        message.channel.send({embeds: [IEmbed]});
    }
};