import Manager from '#managers';

import { Settings } from '#models'; 
import { PermissionFlagsBits } from 'discord.js';

export default {
    name: 'vip',
    description: 'Etiketlenen kullanıcıya vip rolünü verir.',
    usage: '.vip @kullanıcı',
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

            if (!settings || !settings.vipRoleId) return message.reply('Vip rolü bu sunucu için ayarlanmamış!');
            

            const vipRole = message.guild.roles.cache.get(settings.vipRoleId);
            if (!vipRole) return manager.sender.reply(manager.sender.errorEmbed('Ayarlanan Vip rolü sunucuda bulunamıyor!'));

            await targetUser.roles.add(vipRole);
            return manager.sender.reply(manager.sender.classic(`${targetUser} kullanıcısına vip rolü verildi.`));

        } catch (err) {
            console.error('Hata:', err);
            return manager.sender.reply(manager.sender.errorEmbed('❌ Bir hata oluştu, lütfen daha sonra tekrar deneyin.'));
        }
    }
};
