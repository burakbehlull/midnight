import { PermissionFlagsBits } from 'discord.js';

import Manager from '#managers';
import { Settings } from '#models'; 

export default {
    name: 'streamer',
    description: 'Etiketlenen kullanıcıya streamer rolünü verir.',
    usage: '.streamer @kullanıcı',
	category: 'moderation',

    permissions: {
        authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
    },
	
    async execute(client, message, args) {
        const targetUser = message.mentions.members.first();
        const guildId = message.guild.id;
		const manager = new Manager(client, { action: message });

        if (!targetUser) return manager.sender.reply(manager.sender.errorEmbed('Lütfen bir kullanıcı etiketleyin.'));
        
		const PM = new PermissionsManager(message);
      
		const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator);
		if (!ctrl) return manager.sender.reply(manager.sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));


        try {
            const settings = await Settings.findOne({ guildId });

            if (!settings || !settings.streamerRoleId) return manager.sender.reply(manager.sender.errorEmbed('Streamer rolü bu sunucu için ayarlanmamış!'));
            

            const streamerRole = message.guild.roles.cache.get(settings.streamerRoleId);
            if (!streamerRole) return manager.sender.reply(manager.sender.errorEmbed('Ayarlanan Streamer rolü sunucuda bulunamıyor!'));

            await targetUser.roles.add(streamerRole);
            return manager.sender.reply(manager.sender.classic(`${targetUser} kullanıcısına streamer rolü verildi.`));

        } catch (err) {
            console.error('Hata:', err);
            return manager.sender.reply(manager.sender.errorEmbed('❌ Bir hata oluştu, lütfen daha sonra tekrar deneyin.'));
        }
    }
};
