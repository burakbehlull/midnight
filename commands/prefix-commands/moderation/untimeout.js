import { PermissionFlagsBits } from 'discord.js';

import Manager from '#managers';

export default {
  name: 'untimeout',
  aliases: ['susturmakaldir', 'unt'],
  description: 'Belirtilen kullanıcının timeout (susturma) cezasını kaldırır.',
  usage: 'untimeout <@kullanıcı|ID> [sebep]',
  category: 'moderation',

  permissions: {
      authorities: [PermissionFlagsBits.Administrator, PermissionFlagsBits.ModerateMembers],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });

    const targetArg = args[0];
    if (!targetArg) return manager.sender.reply(manager.sender.errorEmbed('❌ Lütfen bir kullanıcı etiketleyin veya ID girin.'));

    let member = message.mentions.members.first();
    if (!member) {
      member = await message.guild.members.fetch(targetArg).catch(() => null);
    }

    if (!member) return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir kullanıcı bulunamadı.'));
    if (!member.moderatable) return manager.sender.reply(manager.sender.errorEmbed('❌ Bu kullanıcının susturması kaldırılamıyor (Yetkisi yüksek veya yetkim yetersiz).'));

    if (!member.communicationDisabledUntil || member.communicationDisabledUntil < Date.now()) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bu kullanıcının zaten aktif bir susturması (timeout) bulunmuyor.'));
    }

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

    try {
      await member.timeout(null, reason);
        return manager.sender.reply(manager.sender.classic(`${member} kullanıcısının susturma (timeout) cezası kaldırıldı.\n**Sebep:** ${reason}`));
    } catch (err) {
      console.error('Untimeout hatası:', err);
        return manager.sender.reply(manager.sender.errorEmbed('❌ Kullanıcının susturması kaldırılırken bir hata oluştu.'));
    }
  }
};
