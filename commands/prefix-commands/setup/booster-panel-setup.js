import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Manager from '#managers';

export default {
  name: 'booster-panel-setup',
  aliases: ['boosterpanel'],
  description: 'Booster özel rol panelini kurar',
  usage: 'booster-panel-setup',
  category: 'booster',

  permissions: {
    enabled: true,
    administrator: true
  },

  async execute(client, message) {
    const manager = new Manager(client, { action: message });

    const ctrl = await manager.authority.checkOwnerAndBotOwners();
    if (!ctrl) return message.reply({ content: '❌ Bu komutu kullanmak owner olmalısın.', ephemeral: true });

    const embed = manager.sender.embed({
      title: '🌟 BOOSTER ÖZEL ROL PANELİ',
      description: `Discord Nitro Boost sayesinde özel ayrıcalıklarınızı kullanabilirsiniz!

**Neler Yapabilirsiniz?**
✨ Özel rol oluşturabilirsiniz
🎨 Rol rengini seçebilirsiniz
😀 Emoji ekleyebilirsiniz
👤 Sunucu isminizi değiştirebilirsiniz
👥 Arkadaşlarınıza rol verebilirsiniz

Aşağıdaki butonları kullanarak işlemlerinizi yapabilirsiniz.`,
      color: 0xf47fff,
      thumbnail: message.guild.iconURL({ size: 128 })
    });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('booster_create')
        .setLabel('Rol Oluştur')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
      
      new ButtonBuilder()
        .setCustomId('booster_edit')
        .setLabel('Rol Düzenle')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Primary),
      
      new ButtonBuilder()
        .setCustomId('booster_nickname')
        .setLabel('İsim Değiştir')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('booster_add_member')
        .setLabel('Üye Ekle')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Primary),
      
      new ButtonBuilder()
        .setCustomId('booster_info')
        .setLabel('Rol Bilgisi')
        .setEmoji('ℹ️')
        .setStyle(ButtonStyle.Secondary),
      
      new ButtonBuilder()
        .setCustomId('booster_delete')
        .setLabel('Rol Sil')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    // Paneli gönder
    await message.channel.send({
      embeds: [embed],
      components: [row1, row2]
    });

    // Kurulum mesajını sil
    await message.delete().catch(() => {});
  }
};
