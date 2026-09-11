import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';
import { Punishment } from '#models';

export default {
  name: 'godban',
  aliases: ['globalban', 'gban', 'tüm-sunuculardan-ban', 'all-ban'],
  description: 'Kullanıcıyı botun bulunduğu tüm sunuculardan (ban yetkisi varsa) tek seferde banlar.',
  usage: 'godban @kullanıcı [sebep]',
  cooldown: 60,
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;

    const ctrl = await manager.authority.checkIsBotOwners();
    if (!ctrl) return message.reply({ content: '❌ Bu komutu kullanmak için Bot Sahibi olmalısın.', ephemeral: true });


    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için Yönetici yetkisine sahip olmalısın.'));
    }

    const deleteMessageDays = 7;

    const targetArg = args[0];
    if (!targetArg) {
      return sender.reply(sender.errorEmbed('❌ Kullanıcı etiketle veya ID yaz.\n\nDoğru kullanım:\n`.godban @Kullanıcı`\n`.godban 123456789012345678 hile yaptı`'));
    }

    let targetUser = null;
    if (message.mentions && message.mentions.users && message.mentions.users.size > 0) {
      targetUser = message.mentions.users.first();
    }

    if (!targetUser) {
      const rawId = String(targetArg).replace(/[^0-9]/g, '');
      if (rawId && rawId.length >= 16) {
        try {
          targetUser = await client.users.fetch(rawId, { force: true });
        } catch {}
      }
    }

    if (!targetUser) {
      return sender.reply(sender.errorEmbed('❌ Kullanıcı bulunamadı. Geçerli bir etiket veya ID ver.'));
    }

    if (targetUser.id === client.user.id) {
      return sender.reply(sender.errorEmbed('❌ Botu kendini banlayamazsın.'));
    }
    if (targetUser.id === message.author.id) {
      return sender.reply(sender.errorEmbed('❌ Kendini banlayamazsın.'));
    }

    const member = message.guild.members.cache.get(targetUser.id);
    if (member) {
      const owner = message.guild.ownerId;
      if (member.id === owner) {
        return sender.reply(sender.errorEmbed('❌ Sunucu sahibini banlayamazsın.'));
      }
      if (message.member.roles && message.member.roles.highest && member.roles && member.roles.highest && message.member.roles.highest.position <= member.roles.highest.position && message.author.id !== owner) {
        return sender.reply(sender.errorEmbed('❌ Rol hiyerarşisi yetersiz. Bu kullanıcıyı banlayamazsın.'));
      }
    }

    const reasonText = args.slice(1).join(' ') || 'Sebep belirtilmemiş';
    const baseReason = `[GOD BAN] ${reasonText} | Global ban by ${message.author.tag} (${message.author.id})`;

    const loading = await sender.reply(sender.classic(`🌩️ **${targetUser.username}** için GOD BAN uygulanıyor... Tüm sunucular taranıyor.`));

    const guilds = Array.from(client.guilds.cache.values());
    const total = guilds.length;

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let failList = [];
    let skipList = [];
    let memberGuildCount = 0;

    for (let i = 0; i < guilds.length; i++) {
      const g = guilds[i];
      const gId = g.id;

      let me;
      try {
        me = g.members.cache.get(client.user.id) || (await g.members.fetch(client.user.id));
      } catch {
        me = null;
      }
      if (!me || !me.permissions || !me.permissions.has(PermissionFlagsBits.BanMembers)) {
        skippedCount++;
        skipList.push({ name: g.name, reason: 'BanMembers yetkisi yok' });
        continue;
      }

      let alreadyBanned = false;
      try {
        const b = await g.bans.fetch(targetUser.id).catch(() => null);
        if (b) alreadyBanned = true;
      } catch {}
      if (alreadyBanned) {
        skippedCount++;
        skipList.push({ name: g.name, reason: 'Zaten banlı' });
        continue;
      }

      const gMember = g.members.cache.get(targetUser.id);
      if (gMember) {
        memberGuildCount++;
        const gOwner = g.ownerId;
        if (gMember.id === gOwner) {
          skippedCount++;
          skipList.push({ name: g.name, reason: 'Sunucu sahibi' });
          continue;
        }
        if (me.roles && me.roles.highest && gMember.roles && gMember.roles.highest && me.roles.highest.position <= gMember.roles.highest.position) {
          skippedCount++;
          skipList.push({ name: g.name, reason: 'Rol hiyerarşisi' });
          continue;
        }
      }

      try {
        await g.bans.create(targetUser.id, {
          deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
          reason: baseReason,
        });
        successCount++;
      } catch (err) {
        failCount++;
        failList.push({ name: g.name, reason: err?.message || String(err).slice(0, 80) });
      }
    }

    try {
      if (targetUser.send) {
        try {
          await targetUser.send({
            embeds: [sender.embed({
              title: '🌩️ GOD BAN Aldın',
              description:
                `Botun bulunduğu sunucularda global ban aldın.\n\n` +
                `**Banlayan:** ${message.author.tag} (${message.author.id})\n` +
                `**Öndeğiğin sebep:** ${reasonText}\n\n` +
                `✅ Başarıyla banlandığın sunucu: **${successCount}**\n` +
                `❌ Başarısız: ${failCount}\n` +
                `⏭️ Atlanan: ${skippedCount}`,
              color: 0x7f1d1d,
            })],
          }).catch(() => {});
        } catch {}
      }
    } catch {}

    try {
      await Punishment.create({
        type: 'godban',
        userID: targetUser.id,
        tag: targetUser.tag,
        admin: message.author.id,
        reason: `[GOD BAN] ${reasonText} | ${successCount}/${total} sunucu`,
        duration: null,
        serverID: message.guild.id,
        successGuilds: successCount,
        totalGuilds: total,
      }).catch(() => {});
    } catch {}

    const summary =
      `👤 **Kullanıcı:** <@${targetUser.id}>  •  ${targetUser.tag}\n` +
      `🧑‍💼 **Banlayan:** ${message.author.tag}\n` +
      `📝 **Sebep:** ${reasonText}\n\n` +
      `📊 **Sonuç:**\n` +
      `   ✅ Başarılı: **${successCount} / ${total}** sunucuda ban atıldı\n` +
      `   ❌ Başarısız: ${failCount}\n` +
      `   ⏭️ Atlanan: ${skippedCount}\n` +
      `   🧑‍🤝‍🧑 Kullanıcının üye olduğu sunucu: ${memberGuildCount}\n` +
      `   🧹 Son ${deleteMessageDays} gün mesajları silindi (izin veren sunucularda)`;

    const fields = [];
    if (failList.length > 0) {
      const firstFails = failList.slice(0, 10);
      fields.push({
        name: `❌ Hata veren sunucular (${failList.length})`,
        value: firstFails.map((f, i) => `  • ${f.name}: \`${f.reason}\``).join('\n') + (failList.length > 10 ? `\n... (${failList.length - 10} tane daha)` : ''),
        inline: false,
      });
    }
    if (skipList.length > 0 && fields.length < 25) {
      const firstSkips = skipList.slice(0, 10);
      fields.push({
        name: `⏭️ Atlanan sunucular (${skipList.length})`,
        value: firstSkips.map((s, i) => `  • ${s.name}: ${s.reason}`).join('\n') + (skipList.length > 10 ? `\n... (${skipList.length - 10} tane daha)` : ''),
        inline: false,
      });
    }

    const embed = sender.embed({
      author: { name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: true }) },
      title: '🌩️ GOD BAN Uygulandı (Tüm Sunuculardan)',
      description: summary,
      color: 0x7f1d1d,
      thumbnail: targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ forceStatic: true, size: 128 }) : undefined,
      fields,
      footer: { text: `Global Ban • ${total} farklı sunucu tarandı. ID: ${targetUser.id}` },
    });

    try {
      if (loading && loading.edit) await loading.edit({ content: null, embeds: [embed], components: [] });
      else await sender.reply({ embeds: [embed] });
    } catch {}
  },
};
