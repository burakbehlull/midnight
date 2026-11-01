import { 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';

export default {
  name: 'backup',
  aliases: ['yedek', 'bck'],
  description: 'Sunucu backup yönetimi',
  usage: 'backup <al|liste|yükle|süre> [args]',
  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
    user: [],
    roles: [],
    guardWhitelistDefault: true
  },

  async execute(client, message, args = []) {
    try {
      const guild = message.guild;

      if (!client.backupManager || !client.permissionsManager) {
        return await message.reply('❌ Backup sistemi henüz yüklenmedi!');
      }

      let subcommand = args[0]?.toLowerCase();
      if (!subcommand || !['al', 'liste', 'yükle', 'yukle', 'süre', 'sure'].includes(subcommand)) {
        return await message.reply('❌ Kullanım: `backup <al|liste|yükle|süre> [args]`');
      }
      if (subcommand === 'yukle') subcommand = 'yükle';
      if (subcommand === 'sure') subcommand = 'süre';
      
      let backupId, hours;
      if (subcommand === 'yükle') {
        backupId = args[1];
        if (!backupId) {
          return await message.reply('❌ Kullanım: `backup yükle <backup_id>`');
        }
      }
      
      if (subcommand === 'süre') {
        hours = parseInt(args[1]);
        if (!hours || hours < 1 || hours > 168) {
          return await message.reply('❌ Kullanım: `backup süre <1-168>` (saat cinsinden)');
        }
      }

      if (subcommand === 'al') {
        const msg = await message.reply('⏳ Backup alınıyor...');

        const backup = await client.backupManager.createBackup(guild.id);

        if (backup) {
          const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Backup Başarıyla Alındı!')
            .setDescription('Sunucunun tam yedeği başarıyla oluşturuldu.')
            .addFields(
              {
                name: '📊 Detaylar',
                value: [
                  `Roller: ${backup.roles.length}`,
                  `Kanallar: ${backup.channels.length}`,
                  `Emojiler: ${backup.emojis.length}`,
                  `Banlar: ${backup.bans.length}`
                ].join('\n'),
                inline: true
              },
              {
                name: '🆔 Backup ID',
                value: `\`${backup._id}\``,
                inline: true
              },
              {
                name: '📅 Tarih',
                value: `<t:${Math.floor(backup.backupDate.getTime() / 1000)}:F>`,
                inline: false
              }
            )
            .setTimestamp()
            .setFooter({ text: guild.name, iconURL: guild.iconURL() });

          return await msg.edit({ content: null, embeds: [embed] });
        } else {
          return await msg.edit('❌ Backup alınırken bir hata oluştu!');
        }

      } else if (subcommand === 'liste') {
        const backups = await client.backupManager.getBackups(guild.id, 10);

        if (backups.length === 0) {
          return await message.reply('❌ Henüz backup alınmamış!');
        }

        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('💾 Backup Listesi')
          .setDescription(`Son ${backups.length} backup gösteriliyor.`)
          .setTimestamp()
          .setFooter({ text: guild.name, iconURL: guild.iconURL() });

        backups.forEach((backup, index) => {
          embed.addFields({
            name: `${index + 1}. Backup`,
            value: [
              `ID: \`${backup._id}\``,
              `Tarih: <t:${Math.floor(backup.backupDate.getTime() / 1000)}:R>`,
              `Roller: ${backup.roles.length} | Kanallar: ${backup.channels.length}`
            ].join('\n'),
            inline: false
          });
        });

        return await message.reply({ embeds: [embed] });

      } else if (subcommand === 'yükle') {
        return await message.reply('⚠️ **DİKKAT:** Bu işlem sunucuyu eski haline döndürür!\n10 saniye içinde tekrar `backup yükle-onayla ' + backupId + '` yazarak onaylayın.');

      } else if (subcommand === 'süre') {
        const milliseconds = hours * 60 * 60 * 1000;
        const success = await client.backupManager.updateBackupInterval(guild.id, milliseconds);

        if (success) {
          const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Backup Süresi Ayarlandı!')
            .setDescription(`Otomatik backup süresi ${hours} saat olarak güncellendi.`)
            .addFields({
              name: 'ℹ️ Bilgi',
              value: `Artık her ${hours} saatte bir otomatik backup alınacak.`,
              inline: false
            })
            .setTimestamp();

          return await message.reply({ embeds: [embed] });
        } else {
          return await message.reply('❌ Backup süresi ayarlanırken bir hata oluştu!');
        }
      }

    } catch (error) {
      console.error('Backup komutu hatası:', error);
      await message.reply('❌ Bir hata oluştu!').catch(() => {});
    }
  }
};
