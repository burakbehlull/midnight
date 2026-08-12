import { PermissionFlagsBits } from 'discord.js';

import Manager from '#managers';
import { Settings } from '#models'; 


export default {
    name: 'photo',
    description: 'Etiketlenen kullanıcıya photo rolünü verir.',
    usage: '.photo @kullanıcı',
	category: 'moderation',

    permissions: {
        authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
    },
	
    async execute(client, message, args) {
		const manager = new Manager(client, { action: message });

        const targetUser = message.mentions.members.first();
        const guildId = message.guild.id;


        if (!targetUser) return manager.sender.reply(manager.sender.errorEmbed('Lütfen bir kullanıcı etiketleyin.'));
        
		
        try {
            const settings = await Settings.findOne({ guildId });

            if (!settings || !settings.photoRoleId) return manager.sender.reply(manager.sender.errorEmbed('Photo rolü bu sunucu için ayarlanmamış!'));
            

            const photoRole = message.guild.roles.cache.get(settings.photoRoleId);
            if (!photoRole) return manager.sender.reply(manager.sender.errorEmbed('Ayarlanan Photo rolü sunucuda bulunamıyor!'));

            await targetUser.roles.add(photoRole);
            return manager.sender.reply(manager.sender.classic(`${targetUser} kullanıcısına photo rolü verildi.`));

        } catch (err) {
            console.error('Hata:', err);
            return manager.sender.reply(manager.sender.errorEmbed('❌ Bir hata oluştu, lütfen daha sonra tekrar deneyin.'));
        }
    }
};
