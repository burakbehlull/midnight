import { PermissionsManager } from '../../../managers/index.js';

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
    const IsRoles = await PM.isRoles();
    const IsOwner = await PM.isOwner();
    const IsAuthority = await PM.isAuthority(PM.flags.BanMembers, PM.flags.Administrator);

    const checks = [];
    if (PM.permissions.isRole) checks.push(IsRoles);
    if (PM.permissions.isOwners) checks.push(IsOwner);
    if (PM.permissions.isAuthority) checks.push(IsAuthority);

    const hasAtLeastOnePermission = checks.includes(true);

    if (!hasAtLeastOnePermission) {
      return message.reply("❌ Bu komutu kullanmak için yeterli yetkin yok.");
    }

    try {
      await guild.bans.remove(userId);
      await message.reply(`<@${userId.id || userId}> adlı kullanıcının banı kaldırıldı.`);
    } catch (err) {
      console.error('Ban kaldırma hatası:', err);
      await message.reply('❌ Kullanıcının banı kaldırılırken bir hata oluştu!');
    }
  }
};
