import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import path from 'path';
import { readdirSync } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';

let cachedCommands = null;
let cachedCommandIds = null;

async function loadAllCommands(client) {
  if (cachedCommands) return { commands: cachedCommands, commandIds: cachedCommandIds };

  const commands = [];
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const prefixDir = path.join(__dirname, '..', 'prefix-commands');
  const slashDir = path.join(__dirname, '..', 'slash-commands');

  function getAllJsFiles(dir) {
    let results = [];
    try {
      const files = readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          results = results.concat(getAllJsFiles(filePath));
        } else if (file.name.endsWith('.js')) {
          results.push(filePath);
        }
      }
    } catch (e) {}
    return results;
  }

  for (const filePath of getAllJsFiles(prefixDir)) {
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const cmd = (await import(fileUrl)).default;
      if (cmd?.name && cmd?.category) {
        commands.push({
          type: 'prefix',
          name: cmd.name,
          description: cmd.description || 'Açıklama yok.',
          usage: cmd.usage || 'Kullanım belirtilmemiş.',
          category: cmd.category,
        });
      }
    } catch (err) {}
  }

  for (const filePath of getAllJsFiles(slashDir)) {
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const cmd = (await import(fileUrl)).default;
      if (cmd?.data?.name && cmd?.category) {
        commands.push({
          type: 'slash',
          name: cmd.data.name,
          description: cmd.description || 'Açıklama yok.',
          usage: cmd.usage || 'Kullanım belirtilmemiş.',
          category: cmd.category,
        });
      }
    } catch (err) {}
  }

  let commandIds = new Map();
  try {
    const fetchedCmds = await client.application.commands.fetch();
    fetchedCmds.forEach(c => commandIds.set(c.name, c.id));
  } catch (e) {}

  cachedCommands = commands;
  cachedCommandIds = commandIds;

  return { commands, commandIds };
}

export default {
  name: 'help',
  aliases: ["yardım"],
  description: 'Komutları kategorilere göre listeler.',
  category: 'extra',

  async execute(client, message, args) {
    try {
      const { commands, commandIds } = await loadAllCommands(client);

      if (!commands.length) return message.reply('Hiç komut bulunamadı.');

      const categories = [...new Set(commands.map(cmd => cmd.category))];

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('category_select')
        .setPlaceholder('Kategori seçin')
        .addOptions(
          categories.map(cat => ({
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            value: cat,
          }))
        );

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle('📚 Yardım Menüsü')
        .setDescription('Bir kategori seçerek o kategorideki komutları görebilirsiniz.')
        .setColor('Blurple');

      const msg = await message.channel.send({
        embeds: [embed],
        components: [selectRow],
      });

      let currentPage = 0;
      let filtered = [];
      let totalPages = 1;
      const pageSize = 5;

      const buildComponents = (page, total) => {
        const navRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('⬅️ Geri')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('İleri ➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= total - 1)
        );

        return [navRow, selectRow];
      };

      const collector = msg.createMessageComponentCollector({
        time: 120_000,
      });

      collector.on('collect', async interaction => {
        try {
          if (interaction.user.id !== message.author.id) {
            return interaction.reply({ content: '❌ Bu menüyü sadece komutu kullanan kişi değiştirebilir.', ephemeral: true }).catch(() => {});
          }

          // 1. ZAMANAŞIMI ENGELLEYİCİ: Discord'a anında cevap veriyoruz
          await interaction.deferUpdate().catch(() => {});

          if (interaction.isStringSelectMenu() && interaction.customId === 'category_select') {
            currentPage = 0;
            const selectedCategory = interaction.values[0];
            filtered = commands.filter(cmd => cmd.category === selectedCategory);
            totalPages = Math.ceil(filtered.length / pageSize) || 1;
          }

          if (interaction.isButton()) {
            if (interaction.customId === 'prev' && currentPage > 0) {
              currentPage--;
            } else if (interaction.customId === 'next' && currentPage < totalPages - 1) {
              currentPage++;
            }
          }

          const paginated = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

          const embedPage = new EmbedBuilder()
            .setTitle(`${filtered.length > 0 ? filtered[0].category.charAt(0).toUpperCase() + filtered[0].category.slice(1) : ''} Komutları`)
            .setColor('Blurple')
            .setDescription(
              paginated
                .map(cmd => {
                  const cmdId = cmd.type === "slash" ? commandIds.get(cmd.name) : null;
                  const slashMention = cmdId ? `</${cmd.name}:${cmdId}>` : '';
                  return `**${cmd.name}** \n> 📄 ${cmd.description}\n> 🔧 \`${cmd.usage}\` ${slashMention}`;
                })
                .join('\n\n') || 'Bu kategoride komut bulunamadı.'
            )
            .setFooter({ text: `Sayfa ${currentPage + 1} / ${totalPages}` });

          // 2. deferUpdate kullandığımız için editReply kullanıyoruz
          await interaction.editReply({
            embeds: [embedPage],
            components: buildComponents(currentPage, totalPages),
          }).catch(() => {});

        } catch (err) {
          console.error('[help interaction error]:', err);
        }
      });

      collector.on('end', async () => {
        try {
          const disabledSelect = new StringSelectMenuBuilder(selectMenu).setDisabled(true);
          const disabledSelectRow = new ActionRowBuilder().addComponents(disabledSelect);

          const disabledNavRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('⬅️ Geri')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('İleri ➡️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

          await msg.edit({
            components: filtered.length > 0 ? [disabledNavRow, disabledSelectRow] : [disabledSelectRow],
          }).catch(() => {});
        } catch (e) {}
      });

    } catch (err) {
      console.error('[help command error]:', err);
      message.reply('Yardım komutu çalıştırılırken bir hata oluştu.').catch(() => {});
    }
  },
};