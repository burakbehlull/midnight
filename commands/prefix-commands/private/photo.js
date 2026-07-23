import { Settings } from '#models'; 
import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
    name: 'photo',
    description: 'Etiketlenen kullanıcıya photo rolünü verir.',
    usage: '.photo @kullanıcı',
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

            if (!settings || !settings.photoRoleId) return message.reply('Photo rolü bu sunucu için ayarlanmamış!');
            

            const photoRole = message.guild.roles.cache.get(settings.photoRoleId);
            if (!photoRole) return sender.reply(sender.errorEmbed('Ayarlanan Photo rolü sunucuda bulunamıyor!'));

            await targetUser.roles.add(photoRole);
            return sender.reply(sender.classic(`${targetUser} kullanıcısına photo rolü verildi.`));

        } catch (err) {
            console.error('Hata:', err);
            return sender.reply(sender.errorEmbed('❌ Bir hata oluştu, lütfen daha sonra tekrar deneyin.'));
        }
    }
};
