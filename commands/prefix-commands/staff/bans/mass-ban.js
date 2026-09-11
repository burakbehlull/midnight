import Manager from '#managers';
import { Punishment } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'mass-ban',
  description: 'Birden fazla kullanıcıyı aynı anda banlar.',
  aliases: ['bans', 'topluban', 'massban'],
  usage: 'mass-ban <@user / userID> <@user / userID> ... <sebep>',
  cooldown: 60,
  category: 'moderation',

  permissions: {},

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    if (args.length === 0) {
      return sender.reply(sender.errorEmbed('❌ En az bir kullanıcı belirtmelisin.\n**Kullanım:** `.mass-ban @user1 @user2 userID sebep`'));
    }

    try {
      const botMember = message.guild.members.cache.get(client.user.id);

      if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        return sender.reply(sender.errorEmbed('❌ Botun ban yetkisi yok.'));
      }

      const mentionedUsers = message.mentions.users;
      const targets = [];
      const nonUserArgs = [];

      for (const arg of args) {
        const mentionMatch = arg.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
          const userId = mentionMatch[1];
          const member = await message.guild.members.fetch(userId).catch(() => null);
          if (member) {
            targets.push(member);
          }
        } 
        else if (/^\d{17,19}$/.test(arg)) {
          const member = await message.guild.members.fetch(arg).catch(() => null);
          if (member) {
            targets.push(member);
          }
        } 
        else {
          nonUserArgs.push(arg);
        }
      }

      const uniqueTargets = Array.from(new Map(targets.map(t => [t.id, t])).values());

      if (uniqueTargets.length === 0) {
        return sender.reply(sender.errorEmbed('❌ Geçerli kullanıcı bulunamadı. Kullanıcıları etiketlediğinden veya doğru ID girdiğinden emin ol.'));
      }

      const reason = nonUserArgs.join(' ') || 'Toplu ban - Sebep belirtilmedi.';

      const bannableUsers = [];
      const errors = [];

      for (const target of uniqueTargets) {
        if (target.id === message.author.id) {
          errors.push(`❌ **${target.user.tag}**: Kendini banlayamazsın.`);
          continue;
        }

        if (target.id === message.guild.ownerId) {
          errors.push(`❌ **${target.user.tag}**: Sunucu sahibini banlayamazsın.`);
          continue;
        }

        if (botMember.roles.highest.position <= target.roles.highest.position) {
          errors.push(`❌ **${target.user.tag}**: Botun rolü bu kullanıcıdan yüksek olmalı.`);
          continue;
        }

        if (message.member.roles.highest.position <= target.roles.highest.position) {
          errors.push(`❌ **${target.user.tag}**: Senden yüksek veya eşit yetkideki birini banlayamazsın.`);
          continue;
        }

        if (!target.bannable) {
          errors.push(`❌ **${target.user.tag}**: Bu kullanıcıyı banlayamam (yetersiz yetki).`);
          continue;
        }

        bannableUsers.push(target);
      }

      if (bannableUsers.length === 0) {
        return sender.reply(sender.errorEmbed(
          `❌ Hiçbir kullanıcı banlanamadı:\n\n${errors.join('\n')}`
        ));
      }

      const confirmEmbed = sender.embed({
        title: '⚠️ Toplu Ban Onayı',
        description: `**${bannableUsers.length}** kullanıcıyı banlamak üzeresin.\n\n` +
          `**Banlanacaklar:**\n` +
          bannableUsers.map((u, i) => `${i + 1}. ${u.user.tag} (${u.id})`).join('\n') +
          `\n\n**Sebep:** ${reason}` +
          (errors.length > 0 ? `\n\n**Atlanacaklar:**\n${errors.join('\n')}` : ''),
        color: manager.theme.colors.yellow,
        footer: { text: 'Onaylamak için 30 saniye içinde "onayla" yaz', iconURL: message.author.displayAvatarURL() }
      });

      const confirmMsg = await sender.reply(confirmEmbed);

      const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'onayla';
      const collected = await message.channel.awaitMessages({ 
        filter, 
        max: 1, 
        time: 30000, 
        errors: ['time'] 
      }).catch(() => null);

      if (!collected || collected.size === 0) {
        return confirmMsg.edit({
          embeds: [sender.errorEmbed('❌ Toplu ban işlemi iptal edildi (zaman aşımı).')],
        });
      }

      const progressMsg = await sender.reply(sender.classic(`⏳ ${bannableUsers.length} kullanıcı banlanıyor...`));

      const banned = [];
      const failed = [];

      for (const target of bannableUsers) {
        try {
          await target.ban({ reason });

          await Punishment.create({
            userId: target.id,
            guildId: message.guild.id,
            staffId: message.author.id,
            type: 'ban',
            duration: null,
            reason
          });

          banned.push(target);
        } catch (err) {
          console.error(`[mass-ban] ${target.id} banlanamadı:`, err);
          failed.push({ user: target, error: err.message });
        }
      }

      const resultEmbed = sender.embed({
        author: { name: message.guild.name, iconURL: message.guild.iconURL() },
        title: '🔨 Toplu Ban Tamamlandı',
        description: 
          `✅ **Başarılı:** ${banned.length} kullanıcı\n` +
          `❌ **Başarısız:** ${failed.length} kullanıcı\n\n` +
          `**Sebep:** ${reason}`,
        fields: [
          {
            name: `✅ Banlanan Kullanıcılar (${banned.length})`,
            value: banned.length > 0 
              ? banned.map((u, i) => `${i + 1}. **${u.user.tag}** (${u.id})`).slice(0, 10).join('\n') + 
                (banned.length > 10 ? `\n... ve ${banned.length - 10} kişi daha` : '')
              : 'Yok',
            inline: false
          }
        ],
        color: banned.length > 0 ? manager.theme.colors.green : manager.theme.colors.red,
        footer: { text: `Banlayan: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() }
      });

      if (failed.length > 0) {
        resultEmbed.addFields({
          name: `❌ Banlanamayan Kullanıcılar (${failed.length})`,
          value: failed.map((f, i) => `${i + 1}. **${f.user.user.tag}**: ${f.error.slice(0, 50)}`).slice(0, 5).join('\n') +
            (failed.length > 5 ? `\n... ve ${failed.length - 5} kişi daha` : ''),
          inline: false
        });
      }

      await progressMsg.edit({
        content: null,
        embeds: [resultEmbed]
      });

      try {
        await collected.first().delete();
        await confirmMsg.delete();
      } catch {}

    } catch (error) {
      console.error('[mass-ban] komut hatası:', error);
      return sender.reply(sender.errorEmbed(`❌ Toplu ban işlemi sırasında bir hata oluştu.\nDetay: \`${error?.message || String(error).slice(0, 120)}\``));
    }
  }
};
