import Manager from '#managers';

function formatUsage(usageCount) {
  if (!usageCount || usageCount === 0) return 'Hiç kullanılmamış';
  return `${usageCount} kullanım`;
}

export default {
  name: 'client-list',
  aliases: ['clientlist', 'app-list', 'application-list', 'clientemojilist'],
  description: 'Botun uygulama (application) emojilerini ve kullanım sayılarını listeler.',
  usage: 'client-list emoji',
  category: 'client',

  permissions: {
    authorities: [],
    user: ['470548458072440842'],
    roles: []
  },

  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });

      const ctrl = await manager.authority.checkIsBotOwners();
      if (!ctrl) return message.reply({ content: '❌ Bu komutu kullanmak bot sahibi olmalısın.', ephemeral: true });


      const subCommand = args[0]?.toLowerCase();

      if (!subCommand || subCommand !== 'emoji') {
        return manager.sender.reply(
          manager.sender.errorEmbed(
            '❌ Doğru kullanım: `.client-list emoji`'
          )
        );
      }

      const loadingMsg = await manager.sender.reply(
        manager.sender.classic('⏳ Botun uygulama emojileri alınıyor...')
      );

      try {
        const emojiManager = client.application.emojis;

        let fetchedCollection = null;
        try {
          fetchedCollection = await emojiManager.fetch();
        } catch (fetchErr) {
          console.warn('[client-list] emoji fetch başarısız, cache kullanılıyor:', fetchErr?.message || fetchErr);
        }

        const source = fetchedCollection && fetchedCollection.size > 0 ? fetchedCollection : emojiManager.cache;
        const emojis = Array.from(source.values());

        if (emojis.length === 0) {
          if (loadingMsg && loadingMsg.edit) {
            await loadingMsg.edit({
              content: null,
              embeds: [
                manager.sender.errorEmbed(
                  '📭 Botun uygulama emojileri şu an boş.\n\n' +
                  'Yüklemek için: `.client-yükle emoji <emoji> <isim>`'
                )
              ],
            });
          }
          return;
        }

        const PAGE_SIZE = 8;
        const totalPages = Math.ceil(emojis.length / PAGE_SIZE);

        const sortArg = args[1]?.toLowerCase();
        if (sortArg === 'sort-usage' || sortArg === 'kullanım') {
          emojis.sort((a, b) => (b.timesUsed ?? 0) - (a.timesUsed ?? 0));
        } else if (sortArg === 'sort-name' || sortArg === 'isim') {
          emojis.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        }

        let currentPage = 0;

        const renderPage = (page) => {
          const start = page * PAGE_SIZE;
          const end = start + PAGE_SIZE;
          const slice = emojis.slice(start, end);

          const totalUsage = emojis.reduce((sum, e) => sum + (e.timesUsed ?? 0), 0);
          const animatedCount = emojis.filter(e => e.animated).length;

          const lines = slice.map((emoji, idx) => {
            const globalIdx = start + idx + 1;
            const emojiStr = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
            return (
              `**${globalIdx}.** ${emojiStr} \`:${emoji.name}:\`\n` +
              `   → ID: \`${emoji.id}\`\n` +
              `   → Format: \`${emojiStr}\`\n` +
              `   → Kullanım: **${formatUsage(emoji.timesUsed ?? 0)}**\n` +
              `   → Tür: ${emoji.animated ? '🌀 Animasyonlu (GIF)' : '🖼️ Statik (PNG)'}`
            );
          });

          const header =
            `📦 **Toplam:** ${emojis.length} emoji (${animatedCount} animasyonlu, ${emojis.length - animatedCount} statik)\n` +
            `📊 **Toplam Kullanım:** ${totalUsage.toLocaleString('tr-TR')}\n\n`;

          return manager.sender.embed({
            title: `🤠 Bot Uygulama Emojileri (Sayfa ${page + 1}/${totalPages})`,
            description: header + lines.join('\n\n'),
            color: 0x7c3aed,
            fields: [
              {
                name: '📖 Sıralama Seçenekleri',
                value:
                  '`.client-list emoji` — varsayılan (yükleme sırası)\n' +
                  '`.client-list emoji kullanım` — çok kullanılan → az kullanılan\n' +
                  '`.client-list emoji isim` — alfabetik',
                inline: false,
              },
              {
                name: '💡 Kullanım İpuçları',
                value:
                  'Mesajlarda: `:emojiadi:` yaz\n' +
                  'Embed/Canvas için: `<:emojiadi:ID>` veya `<a:anim:ID>`',
                inline: false,
              },
            ],
            footer: { text: `Toplam ${emojis.length} emoji • Sayfa ${page + 1} / ${totalPages}` },
          });
        };

        const ActionRow = (await import('discord.js')).ActionRowBuilder;
        const Button = (await import('discord.js')).ButtonBuilder;
        const ButtonStyle = (await import('discord.js')).ButtonStyle;

        const getButtons = () => {
          const row = new ActionRow().addComponents(
            new Button()
              .setCustomId('emoji_list_prev')
              .setLabel('← Önceki')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage === 0),
            new Button()
              .setCustomId('emoji_list_say')
              .setLabel(`${currentPage + 1} / ${totalPages}`)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new Button()
              .setCustomId('emoji_list_next')
              .setLabel('Sonraki →')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage >= totalPages - 1)
          );
          return [row];
        };

        const payload = {
          embeds: [renderPage(currentPage)],
          components: totalPages > 1 ? getButtons() : [],
        };

        let sent;
        if (loadingMsg && loadingMsg.edit) {
          sent = await loadingMsg.edit({ content: null, ...payload });
        } else {
          sent = await manager.sender.reply(payload);
        }

        if (totalPages > 1) {
          const collector = sent.createMessageComponentCollector({
            componentType: 2,
            time: 10 * 60 * 1000,
          });

          collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
              return interaction.reply({
                content: '❌ Bu menüyü sadece komutu kullanan kişi kullanabilir.',
                flags: 64,
              });
            }

            if (interaction.customId === 'emoji_list_prev') {
              currentPage = Math.max(0, currentPage - 1);
            } else if (interaction.customId === 'emoji_list_next') {
              currentPage = Math.min(totalPages - 1, currentPage + 1);
            }

            await interaction.update({
              embeds: [renderPage(currentPage)],
              components: getButtons(),
            });
          });

          collector.on('end', async () => {
            try {
              await sent.edit({
                embeds: [renderPage(currentPage)],
                components: [],
              });
            } catch {}
          });
        }
      } catch (err) {
        console.error('[client-list emoji] Hata:', err);
        if (loadingMsg && loadingMsg.edit) {
          await loadingMsg.edit({
            content: null,
            embeds: [
              manager.sender.errorEmbed(
                '❌ Emoji listesi alınırken hata oluştu.\n' +
                `Hata: \`${err.message || err.toString().slice(0, 150)}\``
              )
            ],
          });
        }
      }
    } catch (err) {
      console.error('client-list komut hatası:', err);
    }
  },
};
