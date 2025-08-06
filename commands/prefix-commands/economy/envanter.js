import { Economy } from '#models';
import { messageSender } from '#helpers';
import { EmbedBuilder } from 'discord.js';


export default {
  name: 'envanter',
  description: 'Sahip olduğun eşyaları listeler.',
  usage: '.envanter',
  category: 'economy',

  async execute(client, message) {
    const sender = new messageSender(message);
    const userId = message.author.id;
	
	const shopItems = [
	  { id: 1, name: 'Kalp', price: 200 },
	  { id: 2, name: 'Gümüş Yüzük', price: 1000 },
	  { id: 3, name: 'Altın Yüzük', price: 10000 },
	  { id: 4, name: 'Elmas Yüzük', price: 100000 }
	];

    const user = await Economy.findOne({ userId }) || new Economy({ userId });
    const entries = [...user.inventory.entries()].map(([itemId, count]) => {
      const item = shopItems.find(i => i.id.toString() === itemId);
      if (!item) return null;
      return `**${item.id}** - ${item.name} - **${count} adet** - Değer: 💰 ${item.price}`;
    }).filter(Boolean);

    if (!entries.length) return sender.reply(sender.classic('📦 Envanterin boş.'));

    const pages = [];
    for (let i = 0; i < entries.length; i += 3) {
      const embed = new EmbedBuilder()
        .setTitle('📦 Envanter')
        .setDescription(entries.slice(i, i + 3).join('\n'))
        .setFooter({ text: `Sayfa ${Math.floor(i / 3) + 1}` });
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
