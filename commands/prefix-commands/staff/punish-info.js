import Manager from '#managers';
import { Punishment } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'ceza-bilgi',
  aliases: ['cezabilgi', 'punish-info', 'punishinfo', 'cezainfo'],
  description: 'Ceza numarasına göre ceza detaylarını gösterir',
  usage: 'ceza-bilgi <cezaId>',
  category: 'staff',
  cooldown: 5,

  permissions: {
    authorities: [PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    const cezaId = args[0];
    if (!cezaId || isNaN(cezaId)) {
      return sender.reply(sender.errorEmbed('❌ Geçerli bir ceza numarası girmelisin.\n\n**Kullanım:** `.ceza-bilgi 5`'));
    }

    const recordId = parseInt(cezaId);

    try {
      const punishment = await Punishment.findOne({
        guildId: message.guild.id,
        recordId: recordId
      });

      if (!punishment) {
        return sender.reply(sender.errorEmbed(`❌ Bu sunucuda **#${recordId}** numaralı ceza kaydı bulunamadı.`));
      }

      const user = await client.users.fetch(punishment.userId).catch(() => null);
      const staff = await client.users.fetch(punishment.staffId).catch(() => null);
      const deletedBy = punishment.deletedBy ? await client.users.fetch(punishment.deletedBy).catch(() => null) : null;
      const removedBy = punishment.removedBy ? await client.users.fetch(punishment.removedBy).catch(() => null) : null;

      const cezaTipleri = {
        'ban': 'Ban',
        'forceban': 'Force Ban',
        'godban': 'God Ban',
        'massban': 'Mass Ban',
        'kick': 'Kick',
        'mute': 'Chat Mute',
        'vmute': 'Voice Mute',
        'timeout': 'Timeout',
        'jail': 'Jail',
        'warn': 'Uyarı',
        'unban': 'Unban',
        'unforceban': 'Unforceban',
        'ungodban': 'Ungodban',
        'unmassban': 'Unmassban',
        'unmute': 'Unmute',
        'unvmute': 'Voice Unmute',
        'unjail': 'Unjail',
        'punishment': '📋 Genel Ceza'
      };

      const cezaTipi = cezaTipleri[punishment.type] || `📋 ${punishment.type}`;

      let banType = '';
      if (punishment.reason) {
        if (punishment.reason.startsWith('[F]')) banType = ' (Force Ban prefix)';
        else if (punishment.reason.startsWith('[G]')) banType = ' (God Ban prefix)';
        else if (punishment.reason.startsWith('[M]')) banType = ' (Mass Ban prefix)';
      }

      const aktifDurum = punishment.active 
        ? '✅ **Aktif** - Ceza şu anda geçerli' 
        : '❌ **Pasif** - Ceza sona erdi veya kaldırıldı';

      const silindiDurum = punishment.deleted
        ? `🗑️ **Silindi** - <t:${Math.floor(punishment.deletedAt?.getTime() / 1000)}:F>`
        : '📋 **Kayıt Aktif**';

      const sure = punishment.duration || 'Kalıcı';
      
      const bitisTarihi = punishment.expiresAt 
        ? `<t:${Math.floor(punishment.expiresAt.getTime() / 1000)}:F> (<t:${Math.floor(punishment.expiresAt.getTime() / 1000)}:R>)`
        : 'Yok (Kalıcı ceza)';

      const kaldirilmaTarihi = punishment.removedAt
        ? `<t:${Math.floor(punishment.removedAt.getTime() / 1000)}:F> (<t:${Math.floor(punishment.removedAt.getTime() / 1000)}:R>)`
        : 'Kaldırılmadı';

      const description = 
        `**🆔 Ceza No:** \`#${punishment.recordId}\`\n` +
        `**📋 Ceza Tipi:** ${cezaTipi}${banType}\n` +
        `**📅 Verilme Tarihi:** <t:${Math.floor(punishment.date.getTime() / 1000)}:F>\n` +
        `**⏰ Süre:** ${sure}\n\n` +
        `**👤 Cezalı Kullanıcı:** ${user ? `<@${user.id}> (\`${user.tag}\`)` : `\`${punishment.userId}\``}\n` +
        `**🛡️ Cezayı Veren:** ${staff ? `<@${staff.id}> (\`${staff.tag}\`)` : `\`${punishment.staffId}\``}\n\n` +
        `**📝 Sebep:**\n${punishment.reason || 'Sebep belirtilmemiş'}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**📊 Durum Bilgileri:**\n` +
        `${aktifDurum}\n` +
        `${silindiDurum}\n\n` +
        `**⏱️ Bitiş Tarihi:** ${bitisTarihi}\n` +
        `**🔓 Kaldırılma Tarihi:** ${kaldirilmaTarihi}\n`;

      const fields = [];

      if (punishment.deleted && deletedBy) {
        fields.push({
          name: '🗑️ Silme Bilgileri',
          value: `**Silen:** <@${deletedBy.id}> (\`${deletedBy.tag}\`)\n**Tarih:** <t:${Math.floor(punishment.deletedAt.getTime() / 1000)}:F>`,
          inline: false
        });
      }

      if (punishment.removedBy && removedBy) {
        fields.push({
          name: '🔓 Kaldırma Bilgileri',
          value: `**Kaldıran:** <@${removedBy.id}> (\`${removedBy.tag}\`)\n**Tarih:** <t:${Math.floor(punishment.removedAt.getTime() / 1000)}:F>`,
          inline: false
        });
      }

      const embed = sender.embed({
        author: { 
          name: `Ceza Bilgisi - #${punishment.recordId}`, 
          iconURL: message.guild.iconURL() 
        },
        title: `${message.guild.name}`,
        description,
        fields,
        thumbnail: user?.displayAvatarURL({ dynamic: true, size: 256 }),
        footer: { 
          text: `Sorgu yapan: ${message.author.tag}`, 
          iconURL: message.author.displayAvatarURL() 
        },
        color: punishment.active ? 0xdc2626 : (punishment.deleted ? 0x6b7280 : 0x10b981),
      });

      return sender.reply(embed, true);

    } catch (error) {
      console.error('[ceza-bilgi] Hata:', error);
      return sender.reply(sender.errorEmbed('❌ Ceza bilgisi alınırken bir hata oluştu.'));
    }
  },
};
