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
      return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı ID'si belirtin."));
    }

    const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator)
	if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));

    try {
      await guild.bans.remove(userId);
      await sender.reply(sender.classic(`<@${userId.id || userId}> adlı kullanıcının banı kaldırıldı.`));
    } catch (err) {
      console.error('Ban kaldırma hatası:', err);
      await sender.reply(sender.errorEmbed('❌ Kullanıcının banı kaldırılırken bir hata oluştu!'));
    }
  }
};
