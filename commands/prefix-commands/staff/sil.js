import { PermissionsManager } from '#managers';

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
    const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator)
	if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');

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
