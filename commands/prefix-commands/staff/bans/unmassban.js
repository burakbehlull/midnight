import Manager from '#managers';
import { ForceBan, Punishment } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'unmassban',
  description: 'Birden fazla kullanıcının banını toplu olarak kaldırır (sadece ban ve massban açar)',
  aliases: ['unmass-ban', 'umban'],
  usage: 'unmassban <userId1> <userId2> <userId3> ...',
  cooldown: 30,
  category: 'bans',

  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    if (args.length < 1) {
      return sender.reply(sender.errorEmbed('❌ En az bir kullanıcı ID\'si girmelisin.\n\n**Kullanım:** `.unmassban 123456789 987654321`'));
    }

    const userIds = args.filter(arg => /^\d{17,20}$/.test(arg));

    if (userIds.length === 0) {
      return sender.reply(sender.errorEmbed('❌ Geçerli kullanıcı ID\'leri girmelisin.'));
    }

    const botMember = message.guild.members.cache.get(client.user.id);
    if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
      return sender.reply(sender.errorEmbed('❌ Botun ban kaldırma yetkisi yok.'));
    }

    const loading = await sender.reply(sender.classic(`⏳ ${userIds.length} kullanıcı için mass unban işlemi başlatılıyor...`));

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const failList = [];
    const skippedList = [];

    for (const userId of userIds) {
      try {
        const existingBan = await message.guild.bans.fetch(userId).catch(() => null);
        
        if (!existingBan) {
          skippedList.push({ id: userId, reason: 'Banlı değil' });
          skippedCount++;
          continue;
        }

        const forceBanRecord = await ForceBan.findOne({ userId, guildId: message.guild.id });

        if (forceBanRecord && (forceBanRecord.banType === 'forceban' || forceBanRecord.banType === 'godban')) {
          const banTypeNames = {
            'forceban': 'Force Ban (sadece unforceban ile açılabilir)',
            'godban': 'God Ban (sadece ungodban ile açılabilir)'
          };
          skippedList.push({ 
            id: userId, 
            reason: `${banTypeNames[forceBanRecord.banType]}` 
          });
          skippedCount++;
          continue;
        }

        await message.guild.bans.remove(userId, `[MASS UNBAN] Kaldıran: ${message.author.tag} (${message.author.id})`);

        if (forceBanRecord) {
          await ForceBan.deleteOne({ userId, guildId: message.guild.id });
        }

        await Punishment.updateMany(
          {
            userId: userId,
            guildId: message.guild.id,
            type: { $in: ['ban', 'massban'] },
            active: true
          },
          {
            $set: {
              active: false,
              removedAt: new Date(),
              removedBy: message.author.id
            }
          }
        );

        successCount++;
      } catch (error) {
        failList.push({ id: userId, reason: error.message || 'Bilinmeyen hata' });
        failCount++;
      }
    }

    const description =
      `**Toplam İşlem:** ${userIds.length}\n` +
      `**Başarılı:** ${successCount}\n` +
      `**Atlanan:** ${skippedCount}\n` +
      `**Başarısız:** ${failCount}\n\n`;

    const fields = [];
    
    if (skippedList.length > 0) {
      const skipText = skippedList.slice(0, 10).map(s => `• \`${s.id}\`: ${s.reason}`).join('\n');
      fields.push({
        name: `Atlanan (${skippedList.length})`,
        value: skipText + (skippedList.length > 10 ? `\n... (+${skippedList.length - 10} daha)` : ''),
        inline: false
      });
    }

    if (failList.length > 0) {
      const failText = failList.slice(0, 10).map(f => `• \`${f.id}\`: ${f.reason}`).join('\n');
      fields.push({
        name: `❌ Başarısız (${failList.length})`,
        value: failText + (failList.length > 10 ? `\n... (+${failList.length - 10} daha)` : ''),
        inline: false
      });
    }

    const embed = sender.embed({
      author: { name: `Mass Unban Tamamlandı`, iconURL: message.guild.iconURL() },
      title: `${message.guild.name} - Toplu Ban Kaldırma`,
      description,
      fields,
      footer: { text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() },
      color: 0x10b981,
    });

    if (loading && loading.edit) {
      await loading.edit({ content: null, embeds: [embed] });
    } else {
      await sender.reply(embed, true);
    }
  },
};
