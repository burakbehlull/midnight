import { PermissionsManager } from '../../managers/index.js';

export default {
  name: 'sil',
  description: 'Mesajları siler',
  usage: 'sil <1-100>',
  async execute(client, message, args) {
    const PM = new PermissionsManager(message);

    const deleteCount = parseInt(args[0]);

    if (isNaN(deleteCount) || deleteCount < 1 || deleteCount > 100) {
      return message.reply('❌ Lütfen 1 ile 100 arasında bir sayı belirtin.');
    }

    // Yetki Kontrolü
    const IsRoles = await PM.isRoles();
    const IsOwner = await PM.isOwner();
    const IsAuthority = await PM.isAuthority(PM.flags.ManageMessages, PM.flags.Administrator);

    const checks = [];
    if (PM.permissions.isRole) checks.push(IsRoles);
    if (PM.permissions.isOwners) checks.push(IsOwner);
    if (PM.permissions.isAuthority) checks.push(IsAuthority);

    const hasAtLeastOnePermission = checks.includes(true);

    if (!hasAtLeastOnePermission) {
      return message.reply('❌ Bu komutu kullanmak için yeterli yetkin yok.');
    }

    try {
      await message.channel.bulkDelete(deleteCount, true);
      const sent = await message.channel.send(`✅ ${deleteCount} mesaj başarıyla silindi.`);
      setTimeout(() => sent.delete().catch(() => {}), 3000);
    } catch (err) {
      console.error('Sil komutu hatası:', err.message);
      return message.reply('❌ Mesajları silerken bir hata oluştu.');
    }
  }
};
