import { messageSender } from '#helpers';

export default {
    name: 'allvmute',
	usage: 'allvmute #VoiceChannel',
    execute(client, message, args) {
		const sender = new messageSender(message);
		
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        if (!channel || channel.type !== 2) return sender.reply(sender.errorEmbed('Geçerli bir ses kanalı belirtmelisin.'));
        channel.members.forEach(member => {
            if (member.id !== message.author.id) {
                member.voice.setMute(true).catch(() => {});
            }
        });
		const IEmbed = sender.classic('Kanal sessize alındı.')
        message.channel.send({embeds: [IEmbed]});
    }
};
