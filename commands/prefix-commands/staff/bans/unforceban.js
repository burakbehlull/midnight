import Manager from '#managers';
import { Punishment } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'unforceban',
  description: 'Force banlanmış kullanıcının banını kaldırır. Normal unban ile aynı API\'yi kullanır ama kayıtlara unforceban olarak işler ve DM atar.',
  aliases: ['unforce-ban', 'ufban', 'unipban', 'unip-ban', 'unsertban', 'unkalıcıban', 'forceunban'],
  usage: 'unforceban <userID> [açıklama/sebep]',
  cooldown: 10,
  category: 'moderation',

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
        await Punishment.create({
          userId: userId,
          guildId: message.guild.id,
          staffId: message.author.id,
          type: 'unforceban',
          duration: null,
          reason,
        });
      } catch (dbErr) {
        console.error('[unforceban] Punishment kaydedilemedi:', dbErr);
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
        `  • 🗃️ Kayıtlara **unforceban** tipiyle işlendi\n` +
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
