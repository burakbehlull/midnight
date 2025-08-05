import { Economy } from '#models';
import { messageSender } from '#helpers';

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  name: 'divorce',
  description: 'Eşinden boşan.',
  usage: '.divorce',
  category: 'economy',

  async execute(client, message) {
    const sender = new messageSender(message);
    const authorId = message.author.id;

    const authorData = await Economy.findOne({ userId: authorId });
    if (!authorData?.marriedTo) return sender.reply(sender.errorEmbed('❌ Zaten evli değilsin.'));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirmDivorce').setLabel('Confirm').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.reply({ content: '❗ Emin misin? Boşanmak için butona tıkla.', components: [row] });

    const filter = (i) => i.customId === 'confirmDivorce' && i.user.id === authorId;
    const collector = msg.createMessageComponentCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', async () => {
      const partnerId = authorData.marriedTo;
      const partnerData = await Economy.findOne({ userId: partnerId });

      authorData.marriedTo = null;
      authorData.marriageSince = null;
      partnerData.marriedTo = null;
      partnerData.marriageSince = null;

      await authorData.save();
      await partnerData.save();

      await msg.edit({ content: '❌ Artık boşandınız.', components: [] });
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        msg.edit({ content: '⌛ Süre doldu, boşanma iptal.', components: [] });
      }
    });
  }
};
