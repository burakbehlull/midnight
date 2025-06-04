import { messageSender } from '#helpers';
import { PermissionsManager } from '#managers';


export default {
    name: 'dağıt',
    execute(client, message) {
        const voiceChannel = message.member.voice.channel;
		
		const sender = new messageSender(message);
		const PM = new PermissionsManager(message);
		
		const ctrl = await PM.control(PM.flags.Administrator)
		console.log(ctrl)
		
		if(true) return
		// if (!ctrl) return sender.reply(sender.errorEmbed("❌ Yetkin yok."));
		
		
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
