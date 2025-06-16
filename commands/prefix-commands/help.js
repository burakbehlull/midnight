import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

import path from 'path';
import { readdirSync } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';

export default {
  name: 'help',
  aliases: ["yardım"],
  description: 'Komutları kategorilere göre listeler.',
  category: 'extra',

  async execute(client, message, args) {
	
    try {
		
	  const getCommands = await client.application.commands.fetch();
	  const getCommand = (c)=> getCommands.find(cmd => cmd.name === c)?.id || null;

      const commands = [];

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const prefixDir = path.join(__dirname, '..', 'prefix-commands');
      const slashDir = path.join(__dirname, '..', 'slash-commands');

      function getAllJsFiles(dir) {
        let results = [];
        const files = readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const filePath = path.join(dir, file.name);
          if (file.isDirectory()) {
            results = results.concat(getAllJsFiles(filePath));
          } else if (file.name.endsWith('.js')) {
            results.push(filePath);
          }
        }
        return results;
      }

      // Prefix komutlarını oku
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
        } catch (err) {
          console.error(`❌ Prefix komutu yüklenemedi: ${filePath}`, err);
        }
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
        } catch (err) {
          console.error(`❌ Slash komutu yüklenemedi: ${filePath}`, err);
        }
      }

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
      let totalPages = 0;
      const pageSize = 5;

      const sendPage = async (page, interaction) => {
        const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

        const embedPage = new EmbedBuilder()
          .setTitle(`${filtered.length > 0 ? filtered[0].category.charAt(0).toUpperCase() + filtered[0].category.slice(1) : ''} Komutları`)
          .setColor('Blurple')
          .setDescription(
            paginated
              .map(
                cmd =>
                  `**${cmd.name}** \n> 📄 ${cmd.description}\n> 🔧 \`${cmd.usage}\` ${cmd.type === "slash" ? `</${cmd.name}:${getCommand(cmd.name)}> `: '' }`
              )
              .join('\n\n') || 'Bu kategoride komut bulunamadı.'
          )
          .setFooter({ text: `Sayfa ${page + 1} / ${totalPages}` });

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
            .setDisabled(page >= totalPages - 1)
        );

        await interaction.update({
          embeds: [embedPage],
          components: [navRow, selectRow],
        });
      };

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
      });

      collector.on('collect', async interaction => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: 'Bu menü sana ait değil.', ephemeral: true });
        }

        currentPage = 0;
        const selectedCategory = interaction.values[0];
        filtered = commands.filter(cmd => cmd.category === selectedCategory);
        totalPages = Math.ceil(filtered.length / pageSize);

        await sendPage(currentPage, interaction);

        const buttonCollector = msg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 820_000,
        });

        buttonCollector.on('collect', async btnInteraction => {
          if (btnInteraction.user.id !== message.author.id) {
            return btnInteraction.reply({ content: 'Bu buton sana ait değil.', ephemeral: true });
          }

          if (btnInteraction.customId === 'prev' && currentPage > 0) currentPage--;
          else if (btnInteraction.customId === 'next' && currentPage < totalPages - 1) currentPage++;

          await sendPage(currentPage, btnInteraction);
        });

        buttonCollector.on('end', async () => {
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

          try {
            await msg.edit({
              components: [disabledNavRow, disabledSelectRow],
            });
          } catch (e) {
           
          }
        });
      });

      collector.on('end', async () => {
        const disabledSelect = new StringSelectMenuBuilder(selectMenu).setDisabled(true);
        const disabledSelectRow = new ActionRowBuilder().addComponents(disabledSelect);

        try {
          await msg.edit({
            components: [disabledSelectRow],
          });
        } catch (e) {
        }
      });
    } catch (err) {
      console.error('[help] error: ', err);
      message.reply('Yardım komutu sırasında bir hata oluştu.');
    }
  },
};
