import { messageSender } from '#helpers';
import { PermissionsManager } from '#managers';


export default {
    name: 'allvunmute',
	usage: "Tüm kullanıcıların mutesini açar",
	aliases: ["hepsinin-mute-aç"],
	category: 'moderation',

    async execute(client, message, args) {
		const sender = new messageSender(message);
		const PM = new PermissionsManager(message);
		
		const ctrl = await PM.control(PM.flags.ManageChannels, PM.flags.Administrator)
		if (!ctrl) return sender.reply(sender.errorEmbed("❌ Yetkin yok."));
		
		
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        if (!channel || channel.type !== 2) return sender.reply(sender.errorEmbed('Geçerli bir ses kanalı belirtmelisin.'));
        channel.members.forEach(member => {
            if (member.id !== message.author.id) {
                member.voice.setMute(false).catch(() => {});
            }
        });
		const IEmbed = sender.classic('Kanalın sessizliği kaldırıldı.')
        message.channel.send({embeds: [IEmbed]});
    }
};