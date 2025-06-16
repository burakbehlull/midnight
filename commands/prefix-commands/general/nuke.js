import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'nuke',
  description: 'Bulunduğun ya da belirttiğin metin kanalını yeniler.',
  usage: 'nuke #kanal',
  category: 'moderation',
  async execute(client, message, args) {
    const sender = new messageSender(message);
    const PM = new PermissionsManager(message);

    // Yetki kontrolü
    const ctrl = await PM.control(PM.flags.ManageChannels);
    if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için **kanalları yönetme** yetkin olmalı.'));

    const channel = message.mentions.channels.first() || message.channel;

    if (!channel.isTextBased?.()) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece metin tabanlı kanallarda kullanılabilir.'));
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
      return sender.reply(sender.errorEmbed('❌ Kanal yenilenirken bir hata oluştu.'));
    }
  }
};
