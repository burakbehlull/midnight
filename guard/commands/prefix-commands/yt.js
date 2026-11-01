import { 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';

export default {
  name: 'yt',
  aliases: ['yetki', 'permissions'],
  description: 'Sunucu yetkileri yönetimi (yt aç/kapat)',
  usage: 'yt <aç|kapat>',
  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
    user: [],
    roles: [],
    guardWhitelistDefault: true
  },

  async execute(client, message, args = []) {
    try {
      const guild = message.guild;
      const member = message.member;

      if (!client.permissionsManager) {
        return await message.reply('❌ Guard sistemi henüz yüklenmedi!');
      }

      let subcommand = args[0]?.toLowerCase();
      if (!subcommand || !['aç', 'ac', 'kapat'].includes(subcommand)) {
        return await message.reply('❌ Kullanım: `yt aç` veya `yt kapat`');
      }
      if (subcommand === 'ac') subcommand = 'aç';

      if (subcommand === 'kapat') {
        const closedRoles = await client.permissionsManager.lockAllPermissions(guild);

        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('🔒 Yetkiler Kapatıldı!')
          .setDescription('Tüm sunucu yetkileri acil durum nedeniyle kapatıldı.')
          .addFields({
            name: '🛡️ Etkilenen Roller',
            value: closedRoles.length > 0 
              ? closedRoles.slice(0, 20).map(r => `\`${r}\``).join(', ') + (closedRoles.length > 20 ? `\n+${closedRoles.length - 20} rol daha...` : '')
              : 'Hiçbir rol etkilenmedi',
            inline: false
          })
          .addFields({
            name: '⚠️ Önemli',
            value: 'Güvenli roller bu işlemden etkilenmedi.\nYetkileri tekrar açmak için `yt aç` komutunu kullanın.',
            inline: false
          })
          .setTimestamp()
          .setFooter({ text: `İşlemi yapan: ${member.user.tag}`, iconURL: member.user.displayAvatarURL() });

        return await message.reply({ embeds: [embed] });

      } else if (subcommand === 'aç') {
        const success = await client.permissionsManager.unlockAllPermissions(guild.id);

        if (success) {
          const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🔓 Yetkiler Açıldı!')
            .setDescription('Sunucu yetkilerinin kilidi kaldırıldı.')
            .addFields({
              name: 'ℹ️ Bilgi',
              value: 'Artık roller normal şekilde yönetilebilir.\nGuard sistemi aktif olarak çalışmaya devam edecek.',
              inline: false
            })
            .setTimestamp()
            .setFooter({ text: `İşlemi yapan: ${member.user.tag}`, iconURL: member.user.displayAvatarURL() });

          return await message.reply({ embeds: [embed] });
        } else {
          return await message.reply('❌ Yetkiler açılırken bir hata oluştu!');
        }
      }

    } catch (error) {
      console.error('YT komutu hatası:', error);
      await message.reply('❌ Bir hata oluştu!').catch(() => {});
    }
  }
};
