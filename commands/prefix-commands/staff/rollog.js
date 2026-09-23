import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RoleHistory } from '#models';

const PAGE_SIZE = 5;

function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function getActionColor(action) {
  const a = action?.toLowerCase() || '';
  if (a.includes('çıkar') || a.includes('remove')) return '#dc2626';
  if (a.includes('tag')) return '#16a34a';
  return '#ea580c';
}

export default {
  name: 'rollog',
  aliases: ['rolelog', 'rol-log', 'rolgecmisi', 'rol-geçmişi'],
  description: 'Belirtilen kullanıcının rol ekleme/çıkarma geçmişini gösterir.',
  usage: '.rollog @kullanıcı | .rollog kullanıcıID',
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;

    if (!message.guild || !message.member) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    let member = message.mentions.members.first();
    if (!member && args[0]) {
      const fetchedMember = await message.guild.members.fetch(args[0]).catch(() => null);
      if (fetchedMember) member = fetchedMember;
    }

    const userId = member?.id || args[0];
    if (!userId) {
      return sender.reply(sender.errorEmbed('❌ Kullanıcıyı etiketlemeli veya geçerli bir ID girmelisin!'));
    }

    let targetUser = member?.user || null;
    if (!targetUser) {
      targetUser = await client.users.fetch(userId).catch(() => null);
    }
    const targetDisplayName = targetUser?.globalName || targetUser?.username || `ID: ${userId}`;
    const targetTag = targetUser?.tag || targetDisplayName;

    const rawPage = parseInt(args[1], 10);

    try {
      const history = await RoleHistory.find({
        userId,
        guildId: message.guild.id
      }).sort({ changedAt: -1 });

      if (!history || history.length === 0) {
        const emptyDesc = `**${targetDisplayName}** adlı kullanıcı için hiç rol güncellemesi bulunmuyor.`;
        return sender.reply(sender.embed({
          title: 'Rol Güncellemesi Yok',
          description: emptyDesc,
          color: manager.theme.colors.red,
          footer: { text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() }
        }));
      }

      const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
      let currentPage = isNaN(rawPage) || rawPage < 1 ? 0 : Math.min(rawPage - 1, totalPages - 1);

      const render = (pageIdx) => {
        const start = pageIdx * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const slice = history.slice(start, end);

        const records = [];
        for (const log of slice) {
          let rolesText;
          if (log.roleNames.length > 1) {
            const combined = log.roleNames.map((name, i) => {
              const rid = log.roleIds?.[i] ? ` (${log.roleIds[i]})` : '';
              return `${name}${rid}`;
            }).join(', ');
            rolesText = `Roller: ${combined}`;
          } else {
            const rid = log.roleIds?.[0] ? ` (${log.roleIds[0]})` : '';
            rolesText = `Rol: • ${log.roleNames[0] || 'Bilinmiyor'}${rid}`;
          }

          const changedById = log.changedBy ? `(${log.changedBy})` : '';

          records.push(
            `${rolesText}\n` +
            `İşlem: ${log.actionLabel || 'Bilinmiyor'}\n` +
            `Yetkili: ${log.changedByName || 'Bilinmiyor'} ${changedById}\n` +
            `Tarih: ${formatDate(log.changedAt)}`
          );
        }

        const recordsBlock = records.map(r => `\`\`\`${r}\`\`\``).join('\n');
        const summaryBlock = `**${history.length} adet rol güncellemesi bulunuyor.**`;
        const description = `${recordsBlock}\n\n${summaryBlock}`.trim();
        const safeDescription = description && description.length > 0 ? description : '(veri yok)';
        const statsLine = `Sayfa ${pageIdx + 1} / ${totalPages}  •  ${start + 1}-${Math.min(end, history.length)} / ${history.length}`;

        return sender.embed({
          author: { name: `${message.guild.name} - Rol Geçmişi`, iconURL: message.guild.iconURL() },
          title: `${targetDisplayName} Rol Güncellemeleri (Sayfa ${pageIdx + 1}/${totalPages})`,
          description: safeDescription,
          color: getActionColor(history[0]?.actionLabel),
          footer: { text: `${message.author.tag} - ${statsLine}`, iconURL: message.author.displayAvatarURL() }
        });
      };

      const getButtons = (pageIdx) => {
        const leftDisabled = pageIdx === 0;
        const rightDisabled = pageIdx >= totalPages - 1;

        const pageBtn = new ButtonBuilder()
          .setCustomId('rollog_page')
          .setLabel(`${pageIdx + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const firstBtn = new ButtonBuilder()
          .setCustomId('rollog_first')
          .setEmoji('⏮️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(leftDisabled);

        const prevBtn = new ButtonBuilder()
          .setCustomId('rollog_prev')
          .setEmoji('⬅️')
          .setLabel('Önceki')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(leftDisabled);

        const nextBtn = new ButtonBuilder()
          .setCustomId('rollog_next')
          .setLabel('Sonraki')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(rightDisabled);

        const lastBtn = new ButtonBuilder()
          .setCustomId('rollog_last')
          .setEmoji('⏭️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(rightDisabled);

        return [new ActionRowBuilder().addComponents(firstBtn, prevBtn, pageBtn, nextBtn, lastBtn)];
      };

      const baseComponents = totalPages > 1 ? getButtons(currentPage) : [];

      const sentMsg = await sender.reply(render(currentPage), undefined, baseComponents);

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
          case 'rollog_first':
            currentPage = 0;
            break;
          case 'rollog_prev':
            currentPage = Math.max(0, currentPage - 1);
            break;
          case 'rollog_next':
            currentPage = Math.min(totalPages - 1, currentPage + 1);
            break;
          case 'rollog_last':
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
      console.error('[rollog] komut hatası:', error);
      return sender.reply(sender.errorEmbed(`❌ Rol geçmişi görüntülenirken hata oluştu.\nDetay: \`${error?.message || String(error).slice(0, 120)}\``));
    }
  },
};
