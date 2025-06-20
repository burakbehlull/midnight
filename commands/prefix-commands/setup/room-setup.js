import { PermissionsManager } from '#managers';
import { messageSender, Button } from '#helpers';
import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
  name: 'room-setup',
  description: 'Özel oda sistemini kurar.',
  category: "extra",
  cooldown: 10,

  async execute(client, message, args) {
    const PM = new PermissionsManager(message);
    const sender = new messageSender(message);

    const category = await message.guild.channels.create({
      name: 'Özel Odalar',
      type: ChannelType.GuildCategory
    });

    const textChannel = await message.guild.channels.create({
      name: 'oda-ayarlari',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: message.guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ]
    });

    const voiceChannel = await message.guild.channels.create({
      name: '➕ Oda Oluştur',
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: message.guild.id,
          allow: [PermissionFlagsBits.Connect],
        },
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('Özel Oda Paneli')
      .setDescription('➕ Odaya katılarak kendi özel odanı oluşturabilirsin. Aşağıdaki butonlarla odanı yönetebilirsin.');

    const btn1 = new Button();
    btn1.add('roomnamebtn', 'Oda Adı', btn1.style.Secondary);
    btn1.add('roomlimitbtn', 'Limit', btn1.style.Secondary);
    btn1.add('roomlockbtn', 'Kilitle', btn1.style.Secondary);
    btn1.add('adduserbtn', 'Kullanıcı Ekle', btn1.style.Primary);

    const btn2 = new Button();
    btn2.add('deleteuserbtn', 'Kullanıcı Kaldır', btn2.style.Danger);
    btn2.add('kickuserbtn', 'Kickle', btn2.style.Danger);
    btn2.add('roomdeletebtn', 'Odayı Sil', btn2.style.Danger);

    await textChannel.send({ embeds: [embed], components: [btn1.build(), btn2.build()] });
    await sender.reply('Özel oda sistemi başarıyla kuruldu');
  }
};
