import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'sil',
  description: 'Mesajları siler',
  usage: 'sil <1-100>',
  aliases: ["clear"],
  cooldown: 5,
  category: 'moderation',
  permissions: {
      authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },
  
  async execute(client, message, args) {

	  const sender = new Manager(client, { action: message }).sender;

    const deleteCount = parseInt(args[0]);

    if (isNaN(deleteCount) || deleteCount < 1 || deleteCount > 100) {
      return sender.reply(sender.errorEmbed('❌ Lütfen 1 ile 100 arasında bir sayı belirtin.'));
    }

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
