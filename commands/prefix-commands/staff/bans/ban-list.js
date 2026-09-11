import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const PAGE_SIZE = 5;

function detectBanType(reason) {
  if (!reason) return { type: 'ban', label: '⚪ Ban', color: '#6b7280' };
  const r = String(reason).toLowerCase();
  if (r.includes('[god ban]') || r.includes('godban') || r.includes('god ban')) {
    return { type: 'godban', label: '🟣 GOD BAN (Global)', color: '#7c3aed' };
  }
  if (r.includes('[force ban]') || r.includes('forceban') || r.includes('force ban')) {
    return { type: 'forceban', label: '🚨 FORCE BAN', color: '#dc2626' };
  }
  return { type: 'ban', label: '⚪ Ban', color: '#6b7280' };
}

export default {
  name: 'ban-list',
  aliases: ['banlist', 'bans', 'banlar', 'forceban-list', 'fbanlist'],
  description: 'Sunucudaki banların listesini sayfalar halinde gösterir. Global name, ID, sebep ve force ban etiketi içerir.',
  usage: 'ban-list [sayfa]',
  cooldown: 10,
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.BanMembers, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    const botMember = message.guild.members.cache.get(client.user.id);
    if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
      return sender.reply(sender.errorEmbed('❌ Botun BanMembers yetkisi yok, ban listesi çekilemiyor.'));
    }

    const rawPage = parseInt(args[0], 10);

    try {
      const loadingMsg = await sender.reply(sender.classic('⏳ Ban listesi çekiliyor...'));

      let banEntries = [];

      let fetched = null;

      try {
        fetched = await message.guild.bans.fetch({ force: true });
      } catch (_err) {
        try {
          fetched = await message.guild.bans.fetch({ force: false, limit: 1000 });
        } catch (_err2) {
          fetched = null;
        }
      }

      if (fetched) {
        banEntries = Array.from(fetched.values());
      }

      if (banEntries.length === 0) {
        const all = message.guild.bans.cache;
        if (all && all.size > 0) {
          banEntries = Array.from(all.values());
        }
      }

      if (banEntries.length === 0) {
        let partial = [];
        const CHUNK = 50;
        let lastId = undefined;
        let failedChunks = 0;
        for (let attempt = 0; attempt < 80; attempt++) {
          try {
            const chunk = await message.guild.bans.fetch({
              limit: CHUNK,
              after: lastId,
              force: false,
            });
            if (!chunk || chunk.size === 0) break;
            partial = partial.concat(Array.from(chunk.values()));
            const arr = Array.from(chunk.keys()).sort();
            if (arr.length < CHUNK) break;
            lastId = arr[arr.length - 1];
          } catch (chunkErr) {
            failedChunks++;
            if (failedChunks >= 3) break;
            lastId = lastId ? BigInt(lastId) + 1n + '' : String(1);
            const small = await message.guild.bans.fetch({ limit: 1, after: lastId }).catch(() => null);
            if (small && small.size > 0) {
              partial = partial.concat(Array.from(small.values()));
              const k = Array.from(small.keys())[0];
              lastId = k;
            } else {
              break;
            }
          }
        }
        if (partial.length > banEntries.length) banEntries = partial;
      }

      const seen = new Set();
      banEntries = banEntries.filter((b) => {
        const id = b?.user?.id;
        if (!id) return true;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      if (banEntries.length === 0) {
        if (loadingMsg && loadingMsg.edit) {
          await loadingMsg.edit({
            content: null,
            embeds: [sender.embed({
              title: '🚫 Sunucuda Banlı Kimse Yok',
              description: `**${message.guild.name}** sunucusunda şu anda hiç kimse banlı değil.`,
              color: manager.theme.colors.red,
              footer: { text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() }
            })],
            components: [],
          });
        }
        return;
      }

      const totalPages = Math.max(1, Math.ceil(banEntries.length / PAGE_SIZE));
      let currentPage = isNaN(rawPage) || rawPage < 1 ? 0 : Math.min(rawPage - 1, totalPages - 1);

      const forceBanCount = banEntries.filter((b) => detectBanType(b?.reason).type === 'forceban').length;
      const godBanCount = banEntries.filter((b) => detectBanType(b?.reason).type === 'godban').length;

      const render = (pageIdx) => {
        const start = pageIdx * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const slice = banEntries.slice(start, end);

        const lines = [];
        for (let i = 0; i < slice.length; i++) {
          const b = slice[i];
          const globalIndex = start + i + 1;
          const user = b?.user || null;
          const userId = user?.id || b?.id || '(id alınamadı)';
          const displayName = user?.globalName || user?.username || '❓ Silinmiş Hesap';
          const tagStr = user?.tag ? `${user.tag}` : user?.username ? `${user.username}` : '*(tag bilinmiyor)*';
          const reasonRaw = b?.reason || '*(Sebep belirtilmemiş)*';
          const { type, label } = detectBanType(reasonRaw);
          const reasonShort = String(reasonRaw).length > 80 ? String(reasonRaw).slice(0, 77) + '...' : reasonRaw;

          lines.push(
            `**${globalIndex}.** \`${displayName}\` | \`${userId}\` | \`${tagStr}\` \n`  +
            `   ${label} | **Sebep:** ${reasonShort}`
          );
        }

        const desc =
          `**Toplam:** ${banEntries.length} ban kaydı\n` +
          `🟣 **GOD BAN:** ${godBanCount} adet\n` +
          `🚨 **Force Ban:** ${forceBanCount} adet\n\n` +
          lines.join('\n\n');

        const statsLine = `Sayfa ${pageIdx + 1} / ${totalPages}  •  ${start + 1}-${Math.min(end, banEntries.length)} / ${banEntries.length}`;

        return sender.embed({
          author: { name: `${message.guild.name} - Ban Listesi`, iconURL: message.guild.iconURL() },
          title: `Ban Kayıtları (Sayfa ${pageIdx + 1}/${totalPages})`,
          description: desc,
          color: manager.theme.colors.red,
          footer: { text: `${message.author.tag} - ${statsLine}`, iconURL: message.author.displayAvatarURL() }
        });
      };

      const getButtons = (pageIdx) => {
        const leftDisabled = pageIdx === 0;
        const rightDisabled = pageIdx >= totalPages - 1;

        const pageBtn = new ButtonBuilder()
          .setCustomId('banlist_page')
          .setLabel(`${pageIdx + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const firstBtn = new ButtonBuilder()
          .setCustomId('banlist_first')
          .setEmoji('⏮️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(leftDisabled);

        const prevBtn = new ButtonBuilder()
          .setCustomId('banlist_prev')
          .setEmoji('⬅️')
          .setLabel('Önceki')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(leftDisabled);

        const nextBtn = new ButtonBuilder()
          .setCustomId('banlist_next')
          .setLabel('Sonraki')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(rightDisabled);

        const lastBtn = new ButtonBuilder()
          .setCustomId('banlist_last')
          .setEmoji('⏭️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(rightDisabled);

        return [new ActionRowBuilder().addComponents(firstBtn, prevBtn, pageBtn, nextBtn, lastBtn)];
      };

      const baseComponents = totalPages > 1 ? getButtons(currentPage) : [];

      let sentMsg;
      if (loadingMsg && loadingMsg.edit) {
        sentMsg = await loadingMsg.edit({
          content: null,
          embeds: [render(currentPage)],
          components: baseComponents,
        });
      } else {
        sentMsg = await sender.reply({ embeds: [render(currentPage)], components: baseComponents });
      }

      if (totalPages <= 1) return;

      const collector = sentMsg.createMessageComponentCollector({
        componentType: 2,
        time: 10 * 60 * 1000,
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== message.author.id) {
          return i.reply({
            content: '❌ Bu butonları sadece komutu kullanan kişi kullanabilir.',
            flags: 64,
          });
        }

        switch (i.customId) {
          case 'banlist_first':
            currentPage = 0;
            break;
          case 'banlist_prev':
            currentPage = Math.max(0, currentPage - 1);
            break;
          case 'banlist_next':
            currentPage = Math.min(totalPages - 1, currentPage + 1);
            break;
          case 'banlist_last':
            currentPage = totalPages - 1;
            break;
          default:
            return;
        }

        await i.update({
          embeds: [render(currentPage)],
          components: getButtons(currentPage),
        });
      });

      collector.on('end', async () => {
        try {
          await sentMsg.edit({
            embeds: [render(currentPage)],
            components: [],
          });
        } catch {}
      });

    } catch (error) {
      console.error('[ban-list] komut hatası:', error);
      return sender.reply(sender.errorEmbed(`❌ Ban listesi sırasında hata oluştu.\nDetay: \`${error?.message || String(error).slice(0, 120)}\``));
    }
  },
};
