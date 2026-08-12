import { PermissionFlagsBits } from 'discord.js';
import Manager from '#managers';

export default {
  name: 'nuke',
  description: 'Bulunduğun ya da belirttiğin metin kanalını yeniler.',
  usage: 'nuke #kanal',
  cooldown: 5,
  category: 'moderation',
  permissions: {
    authorities: [PermissionFlagsBits.ManageMessages],
  },
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });

    const channel = message.mentions.channels.first() || message.channel;

    if (!channel.isTextBased?.()) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bu komut sadece metin tabanlı kanallarda kullanılabilir.'));
    }

    const {
      name,
      type,
      topic,
      parentId,
      position,
      nsfw,
      rateLimitPerUser,
      permissionOverwrites
    } = channel;

    const overwritesArray = permissionOverwrites.cache.map(overwrite => ({
      id: overwrite.id,
      allow: overwrite.allow.bitfield,
      deny: overwrite.deny.bitfield,
      type: overwrite.type
    }));

    try {
      await channel.delete();

      const newChannel = await message.guild.channels.create({
        name,
        type,
        topic,
        nsfw,
        rateLimitPerUser,
        parent: parentId,
        position,
        permissionOverwrites: overwritesArray
      });

      await newChannel.send({
        content: `**Kanal yenilendi.** \`${message.author.globalName}\``
      });

    } catch (err) {
      console.error('Nuke komutu hatası:', err);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Kanal yenilenirken bir hata oluştu.'));
    }
  }
};
