import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'unban',
  description: 'Belirtilen ID\'ye sahip kullanıcının banını kaldırır.',
  usage: 'unban <userId>',
  category: 'moderation',
  permissions: {
      authorities: [PermissionFlagsBits.BanMembers, PermissionFlagsBits.Administrator],
  },
  
  async execute(client, message, args) {
	  const sender = new Manager(client, { action: message }).sender;
	
    const userId = args[0];
    const guild = message.guild;

    if (!userId) {
      return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı ID'si belirtin."));
    }

    try {
      await guild.bans.remove(userId);
      await sender.reply(sender.classic(`<@${userId.id || userId}> adlı kullanıcının banı kaldırıldı.`));
    } catch (err) {
      console.error('Ban kaldırma hatası:', err);
      await sender.reply(sender.errorEmbed('❌ Kullanıcının banı kaldırılırken bir hata oluştu!'));
    }
  }
};
