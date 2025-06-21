import { EmbedBuilder } from 'discord.js';
import { messageSender, Modal } from '#helpers';
import { Settings } from '#models';

export default async function itirafHandler(interaction) {
  const sender = new messageSender(interaction);
  try {
    // Butona basınca modal aç
    if (interaction.isButton()) {
      if (['anonim_itiraf', 'acik_itiraf'].includes(interaction.customId)) {
        const modal = new Modal(`${interaction.customId}_modal`, 'İtiraf Et');
        modal.add('itiraf_mesaj', 'İtirafını Yaz', {
          paragraph: true,
          required: true,
          max: 1000,
        });
        return await interaction.showModal(modal.build());
      }
    }

    // Modal submit olunca
    if (interaction.isModalSubmit()) {
      if (!['anonim_itiraf_modal', 'acik_itiraf_modal'].includes(interaction.customId)) return;

      const confessionText = interaction.fields.getTextInputValue('itiraf_mesaj');
      if (!confessionText || confessionText.trim().length === 0) {
        return interaction.reply({ content: 'Lütfen itiraf mesajını doldurun.', ephemeral: true });
      }

      const isAnonim = interaction.customId === 'anonim_itiraf_modal';

      const settings = await Settings.findOne({ guildId: interaction.guild.id });
      if (!settings || !settings.confessionChannelId) {
        return sender.reply(sender.errorEmbed('İtiraf kanalı ayarlanmamış.', true));
      }

      const channel = interaction.guild.channels.cache.get(settings.confessionChannelId);
      if (!channel) return sender.reply(sender.errorEmbed('İtiraf kanalı bulunamadı.', true));

      const embed = new EmbedBuilder()
        .setDescription(`\`\`\`${confessionText}\n\`\`\``)
        .setColor(sender.colors.pastelPurple)
        .setTimestamp();

      if (isAnonim) {
        embed.setAuthor({ name: 'Anonim' });
      } else {
        embed.setAuthor({
          name: interaction.user.tag,
          iconURL: interaction.user.displayAvatarURL(),
        });
      }

      await channel.send({ embeds: [embed] });
      return interaction.reply({ content: 'İtiraf gönderildi', ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    if (interaction.deferred || interaction.replied) return;
    await interaction.reply({ content: 'Bir hata oluştu.', ephemeral: true });
  }
}
