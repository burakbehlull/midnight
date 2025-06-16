import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'sil',
  description: 'Mesajları siler',
  usage: 'sil <1-100>',
  aliases: ["clear"],
  category: 'moderation',
  
  async execute(client, message, args) {
    const PM = new PermissionsManager(message);
	const sender = new messageSender(message);

    const deleteCount = parseInt(args[0]);

    if (isNaN(deleteCount) || deleteCount < 1 || deleteCount > 100) {
      return sender.reply(sender.errorEmbed('❌ Lütfen 1 ile 100 arasında bir sayı belirtin.'));
    }

    // Yetki Kontrolü
    const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator)
	if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));

    try {
      await message.channel.bulkDelete(deleteCount, true);
	  const IEmbed = sender.errorEmbed(`${deleteCount} mesaj başarıyla silindi.`)
      const sent = await message.channel.send({embeds: [IEmbed]});
      setTimeout(() => sent.delete().catch(() => {}), 3000);
    } catch (err) {
      console.error('Sil komutu hatası:', err.message);
      return sender.reply(sender.errorEmbed('❌ Mesajları silerken bir hata oluştu.'));
    }
  }
};
