import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';
import { Punishment } from '#models';

export default {
  name: 'ungodban',
  aliases: ['ungodban', 'ugban'],
  description: 'Kullanıcının botun bulunduğu tüm sunuculardaki (unban yetkisi varsa) banını kaldırır.',
  usage: 'ungodban <user id> [sebep]',
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

    const targetArg = args[0];
    if (!targetArg) {
      return sender.reply(sender.errorEmbed('❌ Kullanıcı ID yazman zorunludur.\n\nDoğru kullanım:\n`.ungodban 123456789012345678`\n`.ungodban 123456789012345678 itiraz kabul edildi`'));
    }

    const rawId = String(targetArg).replace(/[^0-9]/g, '');
    if (!rawId || rawId.length < 16) {
      return sender.reply(sender.errorEmbed('❌ Geçerli bir kullanıcı ID ver. (etiket değil, NUMARAYLA)'));
    }

    let targetUser = null;
    try {
      targetUser = await client.users.fetch(rawId, { force: true }).catch(() => null);
    } catch {}

    const reasonText = args.slice(1).join(' ') || 'Sebep belirtilmemiş';
    const baseReason = `[UN GOD BAN] ${reasonText} | by ${message.author.tag} (${message.author.id})`;

    const loading = await sender.reply(sender.classic(`**${rawId}** ID'li kullanıcının GOD BAN'ı kaldırılıyor... Tüm sunucular taranıyor.`));

    const guilds = Array.from(client.guilds.cache.values());
    const total = guilds.length;

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let failList = [];
    let skipList = [];
    let bannedGuildCount = 0;
    let firstReason = null;
    let firstGuildWithBan = null;

    for (let i = 0; i < guilds.length; i++) {
      const g = guilds[i];

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

      let existingBan = null;
      try {
        existingBan = await g.bans.fetch(rawId).catch(() => null);
      } catch {}

      if (!existingBan) {
        skippedCount++;
        skipList.push({ name: g.name, reason: 'Kullanıcı o sunucuda banlı değil' });
        continue;
      }

      bannedGuildCount++;
      if (!firstReason) firstReason = existingBan.reason || null;
      if (!firstGuildWithBan) firstGuildWithBan = g.name;

      try {
        await g.bans.remove(rawId, baseReason);
        successCount++;
      } catch (err) {
        failCount++;
        failList.push({ name: g.name, reason: err?.message || String(err).slice(0, 80) });
      }
    }

    try {
      if (targetUser && targetUser.send) {
        try {
          await targetUser.send({
            embeds: [sender.embed({
              title: 'GOD BAN Kaldırıldı',
              description:
                `Botun bulunduğu sunuculardaki global banın kaldırıldı.\n\n` +
                `**Kaldıran:** ${message.author.tag} (${message.author.id})\n` +
                `**Açıklama:** ${reasonText}\n\n` +
                `✅ Başarıyla banın kaldırıldığı sunucu: **${successCount}**\n` +
                `❌ Başarısız: ${failCount}\n` +
                `Atlanan: ${skippedCount}\n\n` +
                `Tekrar sunuculara katılabilirsin. Hoş geldin!`,
              color: 0x10b981,
            })],
          }).catch(() => {});
        } catch {}
      }
    } catch {}

    try {
      await Punishment.create({
        type: 'ungodban',
        userID: rawId,
        tag: targetUser?.tag || rawId,
        admin: message.author.id,
        reason: `[UN GOD BAN] ${reasonText} | ${successCount}/${bannedGuildCount} sunucuda açıldı`,
        duration: null,
        serverID: message.guild.id,
        successGuilds: successCount,
        totalGuilds: bannedGuildCount,
      }).catch(() => {});
    } catch {}

    const uid = targetUser ? `<@${targetUser.id}>  •  ${targetUser.tag}` : `\`${rawId}\` (kullanıcı hesabı çözümlenemedi)`;

    const summary =
      `👤 **Kullanıcı:** ${uid}\n` +
      `🧑‍💼 **Kaldıran:** ${message.author.tag}\n` +
      `📝 **Açıklama:** ${reasonText}\n\n` +
      `📊 **Sonuç:**\n` +
      `   ✅ Banı başarıyla kaldırıldı: **${successCount}** sunucu\n` +
      `   ❌ Başarısız: ${failCount}\n` +
      `Atlanan: ${skippedCount}\n` +
      `Toplam banlı bulunduğu sunucu: ${bannedGuildCount} / ${total}`;

    const fields = [];
    if (firstReason) {
      fields.push({
        name: `İlk Bulunan Önceki Ban Sebebi (${firstGuildWithBan || ''})`,
        value: String(firstReason).length > 180 ? String(firstReason).slice(0, 177) + '...' : String(firstReason),
        inline: false,
      });
    }
    if (failList.length > 0) {
      const firstFails = failList.slice(0, 10);
      fields.push({
        name: `❌ Hata veren sunucular (${failList.length})`,
        value: firstFails.map((f) => `  • ${f.name}: \`${f.reason}\``).join('\n') + (failList.length > 10 ? `\n... (${failList.length - 10} tane daha)` : ''),
        inline: false,
      });
    }
    if (skipList.length > 0 && fields.length < 25) {
      const firstSkips = skipList.slice(0, 10);
      fields.push({
        name: `Atlanan sunucular (${skipList.length})`,
        value: firstSkips.map((s) => `  • ${s.name}: ${s.reason}`).join('\n') + (skipList.length > 10 ? `\n... (${skipList.length - 10} tane daha)` : ''),
        inline: false,
      });
    }

    const embed = sender.embed({
      author: { name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: true }) },
      title: 'GOD BAN Kaldırıldı (Tüm Sunuculardan)',
      description: summary,
      color: 0x10b981,
      thumbnail: targetUser?.displayAvatarURL ? targetUser.displayAvatarURL({ forceStatic: true, size: 128 }) : undefined,
      fields,
      footer: { text: `Global Unban • ${total} farklı sunucu tarandı. ID: ${rawId}` },
    });

    try {
      if (loading && loading.edit) await loading.edit({ content: null, embeds: [embed], components: [] });
      else await sender.reply({ embeds: [embed] });
    } catch {}
  },
};
