import { Settings } from '#models'; 
import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
    name: 'vip',
    description: 'Etiketlenen kullanıcıya vip rolünü verir.',
    usage: '.vip @kullanıcı',
	category: 'moderation',
	
    async execute(client, message, args) {
        const targetUser = message.mentions.members.first();
        const guildId = message.guild.id;
		const sender = new messageSender(message)

        if (!targetUser) return sender.reply(sender.errorEmbed('Lütfen bir kullanıcı etiketleyin.'));
        
		const PM = new PermissionsManager(message);
      
		const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator);
		if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));


        try {
            const settings = await Settings.findOne({ guildId });

            if (!settings || !settings.vipRoleId) return message.reply('Vip rolü bu sunucu için ayarlanmamış!');
            

            const vipRole = message.guild.roles.cache.get(settings.vipRoleId);
            if (!vipRole) return sender.reply(sender.errorEmbed('Ayarlanan Vip rolü sunucuda bulunamıyor!'));

            await targetUser.roles.add(vipRole);
            return sender.reply(sender.classic(`${targetUser} kullanıcısına vip rolü verildi.`));

        } catch (err) {
            console.error('Hata:', err);
            return sender.reply(sender.errorEmbed('❌ Bir hata oluştu, lütfen daha sonra tekrar deneyin.'));
        }
    }
};
