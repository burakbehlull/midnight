import Manager from '#managers';
import { Punishment, ForceBan } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'massban',
  description: 'Birden fazla kullanıcıyı toplu olarak banlar',
  aliases: ['mass-ban', 'mban'],
  usage: 'massban <userId1> <userId2> <userId3> ... [sebep]',
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
      return sender.reply(sender.errorEmbed('❌ En az bir kullanıcı ID\'si girmelisin.\n\n**Kullanım:** `.massban 123456789 987654321 sebep`'));
    }

    const userIds = [];
    const reasonWords = [];
    let reasonStarted = false;

    for (const arg of args) {
      if (/^\d{17,20}$/.test(arg) && !reasonStarted) {
        userIds.push(arg);
      } else {
        reasonStarted = true;
        reasonWords.push(arg);
      }
    }

    if (userIds.length === 0) {
      return sender.reply(sender.errorEmbed('❌ Geçerli kullanıcı ID\'leri girmelisin.'));
    }

    const reason = reasonWords.join(' ') || 'Mass ban - Sebep belirtilmedi';

    const botMember = message.guild.members.cache.get(client.user.id);
    if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
      return sender.reply(sender.errorEmbed('❌ Botun ban yetkisi yok.'));
    }

    const loading = await sender.reply(sender.classic(`⏳ ${userIds.length} kullanıcı için mass ban işlemi başlatılıyor...`));

    let successCount = 0;
    let failCount = 0;
    const failList = [];
    const successList = [];

    for (const userId of userIds) {
      try {
        if (userId === message.author.id) {
          failList.push({ id: userId, reason: 'Kendini banlayamazsın' });
          failCount++;
          continue;
        }

        if (userId === client.user.id) {
          failList.push({ id: userId, reason: 'Botu banlayamazsın' });
          failCount++;
          continue;
        }

        if (userId === message.guild.ownerId) {
          failList.push({ id: userId, reason: 'Sunucu sahibi' });
          failCount++;
          continue;
        }

        const alreadyBanned = await message.guild.bans.fetch(userId).catch(() => null);
        if (alreadyBanned) {
          failList.push({ id: userId, reason: 'Zaten banlı' });
          failCount++;
          continue;
        }

        // Forceban/Godban koruması massban ile ezilemez.
        const existingProtection = await ForceBan.findOne({ userId, guildId: message.guild.id });
        if (existingProtection && (existingProtection.banType === 'forceban' || existingProtection.banType === 'godban')) {
          failList.push({ id: userId, reason: `${existingProtection.banType === 'godban' ? 'GOD BAN' : 'FORCE BAN'} koruması var` });
          failCount++;
          continue;
        }

        await message.guild.bans.create(userId, {
          deleteMessageSeconds: 7 * 24 * 60 * 60,
          reason: `[MASS BAN] ${reason} | Banlayan: ${message.author.tag} (${message.author.id})`,
        });

        let punishmentRecord = null;
        try {
          punishmentRecord = await Punishment.create({
            userId: userId,
            guildId: message.guild.id,
            staffId: message.author.id,
            type: 'massban',
            duration: null,
            reason: `[M] ${reason}`,
          });
        } catch (err) {
          console.error(`[massban] Punishment kaydedilemedi (${userId}):`, err);
        }

        try {
          await ForceBan.findOneAndUpdate(
            { userId: userId, guildId: message.guild.id },
            {
              userId: userId,
              guildId: message.guild.id,
              bannedBy: message.author.id,
              bannedAt: new Date(),
              reason: reason,
              banType: 'massban',
            },
            { upsert: true, new: true }
          );
        } catch {}

        const user = await client.users.fetch(userId).catch(() => null);
        successList.push({ 
          id: userId, 
          tag: user ? user.tag : userId,
          recordId: punishmentRecord?.recordId || '?'
        });
        successCount++;
      } catch (error) {
        failList.push({ id: userId, reason: error.message || 'Bilinmeyen hata' });
        failCount++;
      }
    }

    const description =
      `**Toplam İşlem:** ${userIds.length}\n` +
      `**Başarılı:** ${successCount}\n` +
      `❌ **Başarısız:** ${failCount}\n\n` +
      `**Sebep:** ${reason}\n\n` +
      `🔒 Bu banlar **unban** veya **unmassban** ile açılabilir`;

    const fields = [];
    
    if (successList.length > 0) {
      const successText = successList.slice(0, 15).map(s => 
        `• \`${s.tag}\` - Ceza #${s.recordId}`
      ).join('\n');
      fields.push({
        name: `Başarılı Banlar (${successList.length})`,
        value: successText + (successList.length > 15 ? `\n... (+${successList.length - 15} daha)` : ''),
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
      author: { name: `Mass Ban Uygulandı`, iconURL: message.guild.iconURL() },
      title: `${message.guild.name} - Toplu Ban`,
      description,
      fields,
      footer: { text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() },
      color: 0xea580c,
    });

    if (loading && loading.edit) {
      await loading.edit({ content: null, embeds: [embed] });
    } else {
      await sender.reply(embed, true);
    }
  },
};
