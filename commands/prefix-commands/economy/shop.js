import { Shop } from '#models';
import { messageSender } from '#helpers';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'shop',
  description: 'Mağazadaki ürünleri listeler.',
  usage: '.shop',
  category: 'economy',

  async execute(client, message) {
    const sender = new messageSender(message);

    const shopItems = await Shop.find().sort({ id: 1 });

    if (!shopItems.length) {
      return sender.reply(sender.errorEmbed('❌ Mağazada ürün bulunamadı.'));
    }

    const pages = [];
    for (let i = 0; i < shopItems.length; i += 8) {
      const embed = new EmbedBuilder()
        .setTitle('Mağaza')
        .setDescription(
          shopItems
            .slice(i, i + 8)
            .map(item => `\`${item.id}\` | **${item.name}** - ${item.price} 💰`)
            .join('\n')
        )
        .setFooter({ text: `Sayfa ${Math.floor(i / 8) + 1}` });

      pages.push(embed);
    }

    let current = 0;
    const msg = await message.reply({ embeds: [pages[current]] });

    if (pages.length <= 1) return;

    await msg.react('⬅️');
    await msg.react('➡️');

    const collector = msg.createReactionCollector({
      filter: (reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async (reaction) => {
      await reaction.users.remove(message.author.id);
      if (reaction.emoji.name === '⬅️') current = current > 0 ? current - 1 : pages.length - 1;
      else if (reaction.emoji.name === '➡️') current = current < pages.length - 1 ? current + 1 : 0;
      await msg.edit({ embeds: [pages[current]] });
    });
  }
};
