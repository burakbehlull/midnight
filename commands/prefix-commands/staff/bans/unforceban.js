import Manager from '#managers';
import { Punishment, ForceBan } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'unforceban',
  description: 'Force banlanmış kullanıcının banını kaldırır. Normal unban ile aynı API\'yi kullanır ama kayıtlara unforceban olarak işler ve DM atar.',
  aliases: ['unforce-ban', 'ufban'],
  usage: 'unforceban <userID> [açıklama/sebep]',
  cooldown: 10,
  category: 'bans',

  permissions: {
    authorities: [PermissionFlagsBits.BanMembers, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    try {
      const rawId = String(args[0] || '').trim();
      const idMatch = rawId.match(/^\d{17,20}$/);

      if (!rawId || !idMatch) {
        return sender.reply(sender.errorEmbed(
          '❌ Force banı kaldırılacak kullanıcının **ID**\'sini girmelisin.\n' +
          '**Kullanım:** `.unforceban 123456789012345678`\n' +
          '**Örnek:** `.unforceban 987654321098765432 yanlış banlanmış`'
        ));
      }

      const userId = idMatch[0];
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

      const botMember = message.guild.members.cache.get(client.user.id);
      if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        return sender.reply(sender.errorEmbed('❌ Botun ban kaldırma (BanMembers) yetkisi yok.'));
      }

      const existingBan = await message.guild.bans.fetch(userId).catch(() => null);

      if (!existingBan) {
        return sender.reply(sender.errorEmbed(`❌ Bu ID'ye sahip kullanıcı (\`${userId}\`) şu anda bu sunucuda banlı değil.`));
      }

      const forceBanRecord = await ForceBan.findOne({ userId, guildId: message.guild.id });

      if (forceBanRecord) {
        if (forceBanRecord.banType !== 'forceban') {
          const banTypeNames = {
            'ban': 'Normal Ban (unban ile açılabilir)',
            'godban': 'God Ban (ungodban ile açılabilir)',
            'massban': 'Mass Ban (unban veya ungodban ile açılabilir)'
          };
          const correctCommand = forceBanRecord.banType === 'godban' ? 'ungodban' : 'unban';
          
          return sender.reply(sender.errorEmbed(
            `❌ **Bu ban türünü sadece ilgili komut ile açabilirsin!**\n\n` +
            `**Ban Türü:** ${banTypeNames[forceBanRecord.banType] || forceBanRecord.banType}\n` +
            `**Doğru Komut:** \`.${correctCommand} ${userId}\`\n\n` +
            `💡 Forceban sadece **unforceban** komutuyla açılabilir.`
          ));
        }

        if (forceBanRecord.bannedBy !== message.author.id && message.author.id !== message.guild.ownerId) {
          const bannerUser = await client.users.fetch(forceBanRecord.bannedBy).catch(() => null);
          const bannerTag = bannerUser ? bannerUser.tag : forceBanRecord.bannedBy;
          
          return sender.reply(sender.errorEmbed(
            `❌ **Bu forceban'ı sadece banlayan kişi açabilir!**\n\n` +
            `**Banlayan:** <@${forceBanRecord.bannedBy}> (\`${bannerTag}\`)\n` +
            `**Tarih:** <t:${Math.floor(forceBanRecord.bannedAt.getTime() / 1000)}:F>\n` +
            `**Sebep:** ${forceBanRecord.reason}\n\n` +
            `💡 Eğer banı açman gerekiyorsa, banlayan kişiyle iletişime geç veya sunucu sahibinden yardım iste.`
          ));
        }
      }

      const bannedUser = existingBan.user || (await client.users.fetch(userId, { force: true }).catch(() => null));
      const tagStr = bannedUser ? bannedUser.tag : userId;

      const loadingMsg = await sender.reply(sender.classic(`♻️ <@${userId}> forcebanı kaldırılıyor...`));

      try {
        await message.guild.bans.remove(userId, `[UNFORCEBAN] ${reason} | Kaldıran: ${message.author.tag} (${message.author.id})`);
      } catch (unbanErr) {
        if (loadingMsg && loadingMsg.edit) {
          await loadingMsg.edit({
            content: null,
            embeds: [sender.errorEmbed(`❌ Force ban kaldırma başarısız.\nHata: \`${unbanErr?.message || String(unbanErr).slice(0, 150)}\``)],
          });
        }
        return;
      }

      try {
        await Punishment.updateMany(
          {
            userId: userId,
            guildId: message.guild.id,
            type: 'forceban',
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
      } catch (dbErr) {
        console.error('[unforceban] Punishment güncellenemedi:', dbErr);
      }

      try {
        await ForceBan.deleteOne({ userId, guildId: message.guild.id });
        console.log(`[unforceban] ForceBan kaydı silindi: ${userId}`);
      } catch (dbErr) {
        console.error('[unforceban] ForceBan silinemedi:', dbErr);
      }

      let dmSend = false;
      if (bannedUser && bannedUser.id && !bannedUser.bot) {
        try {
          await client.users.send(userId, {
            content:
              `**Force Ban Kaldırıldı**\n\n` +
              `**Sunucu:** ${message.guild.name}\n` +
              `**Kaldıran:** ${message.author.tag}\n\n` +
              `**Açıklama:** ${reason}\n\n` +
              `Tekrar sunucuya katılabilirsin. Hoş geldin!`
          });
          dmSend = true;
        } catch {
          dmSend = false;
        }
      }

      const description =
        `**Kullanıcı:** ${bannedUser ? `<@${bannedUser.id}> \`${tagStr}\`` : `\`${userId}\``}\n` +
        `**ID:** \`${userId}\`\n\n` +
        `**Kaldıran:** <@${message.author.id}> \`${message.author.tag}\`\n\n` +
        `**Açıklama:** ${reason}\n` +
        (existingBan.reason ? `\n**Önceki Ban Sebebi:** \`${existingBan.reason}\`\n` : '') +
        `\n📌 **Kaldırma Özellikleri:**\n` +
        `  • Sunucu banı **tamamen** kaldırıldı\n` +
        `  • Kayıtlara **unforceban** tipiyle işlendi\n` +
        `  • ${dmSend ? 'Kullanıcıya **DM bildirimi gönderildi**' : 'Kullanıcıya **DM bildirimi gönderilemedi** (DM kapalı veya bot kullanıcı)'}\n\n`;

      const embed = sender.embed({
        author: { name: `Force Ban Kaldırıldı`, iconURL: message.guild.iconURL() },
        title: `${message.guild.name} - Kaldırma İşlemi`,
        description,
        thumbnail: bannedUser ? bannedUser.displayAvatarURL({ dynamic: true, size: 256 }) : null,
        footer: { text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() },
        color: 0x10b981,
      });

      if (loadingMsg && loadingMsg.edit) {
        await loadingMsg.edit({ content: null, embeds: [embed] });
      } else {
        await sender.reply(embed, true);
      }

    } catch (error) {
      console.error('[unforceban] komut hatası:', error);
      return sender.reply(sender.errorEmbed(`❌ Force ban kaldırılırken hata oluştu.\nDetay: \`${error?.message || String(error).slice(0, 120)}\``));
    }
  },
};
