import Manager from '#managers';
import { Punishment } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'forceban',
  description: 'Kullanıcıyı sunucudan force ban atar. Normal bana göre: son 7 gün mesaj siler, DM bildirir.',
  aliases: ['force-ban', 'fban'],
  usage: 'forceban <@user / userID> [sebep]',
  cooldown: 15,
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    try {
      let targetMember = message.mentions?.members?.first?.();
      let targetUser = null;

      if (!targetMember && args[0]) {
        targetMember = await message.guild.members.fetch(args[0]).catch(() => null);
        if (!targetMember) targetMember = message.guild.members.cache.get(args[0]);

        if (!targetMember) {
          const idMatch = String(args[0]).match(/^\d{17,20}$/);
          if (idMatch) {
            targetUser = await client.users.fetch(args[0], { force: true }).catch(() => null);
          }
        }
      }

      if (!targetMember && !targetUser) {
        return sender.reply(sender.errorEmbed('❌ Force banlanacak kullanıcıyı etiketlemeli veya geçerli bir ID girmelisin.'));
      }

      const user = targetMember ? targetMember.user : targetUser;
      const member = targetMember || null;

      const reason = args.slice(1).join(' ') || 'Force ban - Sebep belirtilmedi.';

      if (user.id === message.author.id) {
        return sender.reply(sender.errorEmbed('❌ Kendini force banlayamazsın.'));
      }

      if (user.bot && user.id === client.user.id) {
        return sender.reply(sender.errorEmbed('❌ Botun kendisini force banlamaz.'));
      }

      const botMember = message.guild.members.cache.get(client.user.id);

      if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        return sender.reply(sender.errorEmbed('❌ Botun ban yetkisi (BanMembers) yok.'));
      }

      if (member) {
        if (member.id === message.guild.ownerId) {
          return sender.reply(sender.errorEmbed('❌ Sunucu sahibini force banlayamazsın.'));
        }
        if (botMember.roles.highest.position <= member.roles.highest.position) {
          return sender.reply(sender.errorEmbed('❌ Botun rolü, force banlayacağın kişiden yüksek olmalı.'));
        }
        if (message.member.roles.highest.position <= member.roles.highest.position && message.author.id !== message.guild.ownerId) {
          return sender.reply(sender.errorEmbed('❌ Senden yüksek veya eşit yetkideki birini force banlayamazsın.'));
        }
        if (!member.bannable) {
          return sender.reply(sender.errorEmbed('❌ Bu kullanıcı bu sunucuda banlanamaz (rol hiyerarşisi yetersiz veya Discord koruması var).'));
        }
      }

      const alreadyBanned = await message.guild.bans.fetch(user.id).catch(() => null);
      if (alreadyBanned) {
        return sender.reply(sender.errorEmbed(`❌ **${user.tag}** zaten bu sunucuda banlı.\nMevcut ban nedeni: \`${alreadyBanned.reason || 'Belirtilmemiş'}\``));
      }

      const deleteMessageDays = 7;

      const loadingMsg = await sender.reply(sender.classic(`<@${user.id}> için **force ban** uygulanıyor...`));

      try {
        await message.guild.bans.create(user.id, {
          deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
          reason: `[FORCE BAN] ${reason} | Banlayan: ${message.author.tag} (${message.author.id})`,
        });
      } catch (banErr) {
        if (loadingMsg && loadingMsg.edit) {
          await loadingMsg.edit({
            content: null,
            embeds: [sender.errorEmbed(`❌ Force ban başarısız.\nHata: \`${banErr?.message || String(banErr).slice(0, 150)}\``)],
          });
        }
        return;
      }

      try {
        await Punishment.create({
          userId: user.id,
          guildId: message.guild.id,
          staffId: message.author.id,
          type: 'forceban',
          duration: null,
          reason,
        });
      } catch (dbErr) {
        console.error('[forceban] Punishment kaydedilemedi:', dbErr);
      }

      try {
        await client.users.send(user.id, {
          content:
            `🚨 **Force Ban Aldın**\n\n` +
            `**Sunucu:** ${message.guild.name}\n` +
            `**Banlayan:** ${message.author.tag}\n\n` +
            `**Sebep:** ${reason}\n\n` +
            `Son ${deleteMessageDays} güne ait tüm mesajların da sunucudan silindi.\n` +
            `Bu işlem Discord botu tarafından uygulanan force bir ban'dır.\n` +
            `İtiraz etmek istiyorsan sunucu yetkilileriyle iletişime geçmelisin.`
        }).catch(() => {});
      } catch {}

      const statusEmoji = '🚨';
      const description =
        `**Kullanıcı:** <@${user.id}> \`${user.tag}\`\n` +
        `**ID:** \`${user.id}\`\n\n` +
        `**Banlayan:** <@${message.author.id}> \`${message.author.tag}\`\n\n` +
        `**Sebep:** ${reason}\n\n` +
        `📌 **Force Ban Özellikleri:**\n` +
        `  • Sunucudan **kalıcı olarak** banlandı\n` +
        `  • 🧹 Son **${deleteMessageDays} gün**ün tüm mesajları silindi\n` +
        `  • 📩 Kullanıcıya DM'den **bildirim gönderildi**\n` +
        `  • 🗃️ Kayıtlara **forceban** tipiyle işlendi\n\n`;

      const embed = sender.embed({
        author: { name: `Force Ban Uygulandı`, iconURL: message.guild.iconURL() },
        title: `${message.guild.name} - Force Ban`,
        description,
        thumbnail: user.displayAvatarURL({ dynamic: true, size: 256 }),
        footer: { text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() },
        color: 0x991b1b,
      });

      if (loadingMsg && loadingMsg.edit) {
        await loadingMsg.edit({ content: null, embeds: [embed] });
      } else {
        await sender.reply(embed, true);
      }

    } catch (error) {
      console.error('[forceban] komut hatası:', error);
      return sender.reply(sender.errorEmbed(`❌ Force ban sırasında hata oluştu.\nDetay: \`${error?.message || String(error).slice(0, 120)}\``));
    }
  },
};
