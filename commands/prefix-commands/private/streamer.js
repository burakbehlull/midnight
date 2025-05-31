import Settings from '../../../models/Settings.js'; 
import { PermissionsManager } from '../../../managers/index.js';

export default {
    name: 'streamer',
    description: 'Etiketlenen kullanıcıya streamer rolünü verir.',
    usage: '.streamer @kullanıcı',
	
    async execute(client, message, args) {
        const targetUser = message.mentions.members.first();
        const guildId = message.guild.id;

        if (!targetUser) return message.reply('Lütfen bir kullanıcı etiketleyin.');
        
		const PM = new PermissionsManager(message);
      
		const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator);
		if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');


        try {
            const settings = await Settings.findOne({ guildId });

            if (!settings || !settings.streamerRoleId) return message.reply('Streamer rolü bu sunucu için ayarlanmamış!');
            

            const streamerRole = message.guild.roles.cache.get(settings.streamerRoleId);
            if (!streamerRole) return message.reply('Ayarlanan Streamer rolü sunucuda bulunamıyor!');

            await targetUser.roles.add(streamerRole);
            return message.reply(`${targetUser} kullanıcısına streamer rolü verildi.`);

        } catch (err) {
            console.error('Hata:', err);
            return message.reply('❌ Bir hata oluştu, lütfen daha sonra tekrar deneyin.');
        }
    }
};
