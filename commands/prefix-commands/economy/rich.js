import Manager from '#managers';
import { Economy } from '#models';

export default {
  name: 'zenginler',
  category: 'economy',
  aliases: ['rich', 'richest', 'lb', 'leaderboard', 'top', 'en-zenginler'],
  usage: '.zenginler [server|global]',
  description: 'Sunucudaki veya globaldeki en zengin 10 kişiyi sıralar.',
  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const rawArg = (args[0] || 'server').toString().toLowerCase();

    let mode;
    if (rawArg === 'global' || rawArg === 'g' || rawArg === 'tüm') {
      mode = 'global';
    } else {
      mode = 'server';
    }

    let topUsers;
    try {
      if (mode === 'global') {
        topUsers = await Economy.find()
          .sort({ money: -1 })
          .limit(10)
          .lean();
      } else {
        if (!message.guild) {
          return manager.sender.reply(manager.sender.errorEmbed('❌ Server sıralaması sadece bir sunucuda kullanılabilir.'));
        }
        let memberIds;
        try {
          const members = await message.guild.members.fetch().catch(() => null);
          if (members) {
            memberIds = Array.from(members.keys());
          } else {
            memberIds = Array.from(message.guild.members.cache.keys());
          }
        } catch (_) {
          memberIds = Array.from(message.guild.members.cache.keys());
        }
        if (!memberIds || memberIds.length === 0) {
          return manager.sender.reply(manager.sender.errorEmbed('❌ Sunucu üyeleri alınamadı.'));
        }
        topUsers = await Economy.find({ userId: { $in: memberIds } })
          .sort({ money: -1 })
          .limit(10)
          .lean();
      }
    } catch (e) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Liderlik tablosu yüklenemedi.'));
    }

    if (!topUsers || topUsers.length === 0) {
      const msg = mode === 'global'
        ? '❌ Henüz global Economy kaydı olan kullanıcı yok.'
        : '❌ Bu sunucuda henüz Economy kaydı olan kullanıcı yok.';
      return manager.sender.reply(manager.sender.errorEmbed(msg));
    }

    const RANK_MEDALS = ['🥇', '🥈', '🥉'];
    const fields = [];
    let maxLen = 0;

    const resolved = [];
    for (let i = 0; i < topUsers.length; i++) {
      const u = topUsers[i];
      let displayName = null;
      try {
        const cached = client.users.cache.get(u.userId);
        if (cached) {
          displayName = cached.globalName ?? cached.username ?? cached.id;
        } else {
          const fetched = await client.users.fetch(u.userId).catch(() => null);
          if (fetched) {
            displayName = fetched.globalName ?? fetched.username ?? fetched.id;
          } else {
            displayName = `Bilinmeyen (${u.userId})`;
          }
        }
      } catch (_) {
        displayName = `Bilinmeyen (${u.userId})`;
      }
      const money = (u.money ?? 0);
      const len = displayName.length;
      if (len > maxLen) maxLen = len;
      resolved.push({ displayName, money, userId: u.userId });
    }

    for (let i = 0; i < resolved.length; i++) {
      const medal = RANK_MEDALS[i] || ``;
      const entry = resolved[i];
      const paddedName = entry.displayName.padEnd(maxLen + 2, ' ');
      const value = `${paddedName}${entry.money.toLocaleString('tr-TR')} coin`;
      fields.push({
        name: `${medal} Tier ${i + 1}`,
        value: `<@${entry.userId}>\n\`\`\`${value}\`\`\``,
        inline: false,
      });
    }

    const totalMoney = resolved.reduce((sum, r) => sum + (r.money ?? 0), 0);

    const isGlobal = mode === 'global';
    const title = isGlobal
      ? 'GLOBAL - EN ZENGİNLER LİDER TABLOSU'
      : `${(message.guild?.name || 'SERVER').toUpperCase()} - EN ZENGİNLER`;
    const color = isGlobal ? manager.sender.colors.purple : manager.sender.colors.gold;
    const scopeText = isGlobal ? 'Global' : `Sunucu: ${message.guild?.name || 'Bilinmeyen'}`;

    const embed = manager.sender.embed({
      color,
      title,
      description:
        `Toplam **${resolved.length}** kullanıcı listelendi\n` +
        `Toplam Servet (ilk 10): **${totalMoney.toLocaleString('tr-TR')}** coin`,
      fields,
      footer: { text: `İsteği yapan: ${message.author.globalName ?? message.author.username}` }
    });

    try {
      await message.channel.send({ embeds: [embed] });
    } catch (e) {
      await manager.sender.reply(manager.sender.errorEmbed('❌ Liderlik tablosu gönderilemedi.'));
    }
  },
};
