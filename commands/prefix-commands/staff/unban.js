import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'unban',
  description: 'Belirtilen ID\'ye sahip kullanıcının banını kaldırır.',
  usage: 'unban <userId>',
  async execute(client, message, args) {
    const PM = new PermissionsManager(message);
	const sender = new messageSender(message);
	
    const userId = args[0];
    const guild = message.guild;

    if (!userId) {
      return sender.reply(sender.errorMessage("❌ Lütfen bir kullanıcı ID'si belirtin."));
    }

    // Yetki Kontrolü
    const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator)
	if (!ctrl) return message.reply(sender.errorMessage('❌ Bu komutu kullanmak için yetkin yok.'));

    try {
      await guild.bans.remove(userId);
      await message.reply(sender.classic(`<@${userId.id || userId}> adlı kullanıcının banı kaldırıldı.`));
    } catch (err) {
      console.error('Ban kaldırma hatası:', err);
      await message.reply(sender.errorMessage('❌ Kullanıcının banı kaldırılırken bir hata oluştu!'));
    }
  }
};
