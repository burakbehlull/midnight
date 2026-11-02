import Manager from '#managers';
import { Button } from '#helpers';
import { RoomSetup } from '#models';
import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
  name: 'room-setup',
  description: 'Özel oda sistemini kurar.',
  category: "setup",
  cooldown: 10,

  async execute(client, message) {
    const manager = new Manager(client, {
      action: message
    });

    const sender = manager.sender

    const ctrl = await manager.authority.checkOwnerAndBotOwners();
    if (!ctrl) return message.reply({ content: '❌ Bu komutu kullanmak owner olmalısın.', ephemeral: true });

    const category =
      message.guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === 'Özel Odalar'
      ) ??
      (await message.guild.channels.create({
        name: 'Özel Odalar',
        type: ChannelType.GuildCategory
      }));

    let textChannel = message.guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        c.name === 'oda-ayarlari' &&
        c.parentId === category.id
    );
    if (!textChannel) {
      textChannel = await message.guild.channels.create({
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
    }

    let voiceChannel = message.guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildVoice &&
        c.parentId === category.id &&
        c.name.includes('Oluştur')
    );
    if (!voiceChannel) {
      voiceChannel = await message.guild.channels.create({
        name: 'Oda Oluştur',
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: [PermissionFlagsBits.Connect],
          },
        ]
      });
    }

    await RoomSetup.findOneAndUpdate(
      { guildId: message.guild.id },
      {
        guildId: message.guild.id,
        createChannelId: voiceChannel.id,
        categoryId: category.id,
        textChannelId: textChannel.id,
        createdAt: new Date()
      },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setTitle('Özel Oda Paneli')
      .setDescription('➕ Odaya katılarak kendi özel odanı oluşturabilirsin. Aşağıdaki butonlarla odanı yönetebilirsin.');

    const btn1 = new Button();
    btn1.add('roomnamebtn', 'Oda Adı', btn1.style.Secondary);
    btn1.add('roomlimitbtn', 'Limit', btn1.style.Secondary);
    btn1.add('roomlockbtn', 'Kilitle / Aç', btn1.style.Secondary);
    btn1.add('adduserbtn', 'Kullanıcı Ekle', btn1.style.Primary);

    const btn2 = new Button();
    btn2.add('deleteuserbtn', 'Kullanıcı Kaldır', btn2.style.Danger);
    btn2.add('kickuserbtn', 'Kickle', btn2.style.Danger);
    btn2.add('roomdeletebtn', 'Odayı Sil', btn2.style.Danger);

    await textChannel.send({ embeds: [embed], components: [btn1.build(), btn2.build()] });
    await sender.reply('Özel oda sistemi başarıyla kuruldu');
  }
};
