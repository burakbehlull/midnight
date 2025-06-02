import { Settings } from '#models'; 
import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
    name: 'streamer',
    description: 'Etiketlenen kullanıcıya streamer rolünü verir.',
    usage: '.streamer @kullanıcı',
	
    async execute(client, message, args) {
        const targetUser = message.mentions.members.first();
        const guildId = message.guild.id;

        if (!targetUser) return sender.reply(sender.errorEmbed('Lütfen bir kullanıcı etiketleyin.'));
        
		const PM = new PermissionsManager(message);
      
		const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator);
		if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));


        try {
            const settings = await Settings.findOne({ guildId });

            if (!settings || !settings.streamerRoleId) return sender.reply(sender.errorEmbed('Streamer rolü bu sunucu için ayarlanmamış!'));
            

            const streamerRole = message.guild.roles.cache.get(settings.streamerRoleId);
            if (!streamerRole) return sender.reply(sender.errorEmbed('Ayarlanan Streamer rolü sunucuda bulunamıyor!'));

            await targetUser.roles.add(streamerRole);
            return sender.reply(sender.classic(`${targetUser} kullanıcısına streamer rolü verildi.`));

        } catch (err) {
            console.error('Hata:', err);
            return sender.reply(sender.errorEmbed('❌ Bir hata oluştu, lütfen daha sonra tekrar deneyin.'));
        }
    }
};
