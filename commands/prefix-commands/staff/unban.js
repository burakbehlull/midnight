import { PermissionsManager } from '#managers';

export default {
  name: 'unban',
  description: 'Belirtilen ID\'ye sahip kullanıcının banını kaldırır.',
  usage: 'unban <kullanıcıID>',
  async execute(client, message, args) {
    const PM = new PermissionsManager(message);
    const userId = args[0];
    const guild = message.guild;

    if (!userId) {
      return message.reply("❌ Lütfen bir kullanıcı ID'si belirtin.");
    }

    // Yetki Kontrolü
    const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator)
	if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');

    try {
      await guild.bans.remove(userId);
      await message.reply(`<@${userId.id || userId}> adlı kullanıcının banı kaldırıldı.`);
    } catch (err) {
      console.error('Ban kaldırma hatası:', err);
      await message.reply('❌ Kullanıcının banı kaldırılırken bir hata oluştu!');
    }
  }
};
