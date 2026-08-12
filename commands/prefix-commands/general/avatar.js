import { EmbedBuilder } from 'discord.js';
import Manager from '#managers';

export default {
  name: 'avatar',
  description: 'Etiketlenen kullanıcının veya kendi avatarını gösterir.',
  usage: 'avatar @kullanıcı',
  category: 'user',
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });

    const user = message.mentions.users.first() || message.author;

    try {
      const embed = new EmbedBuilder(manager.sender.embed({
        title: 'Avatar',
        footer: { text: user.username, iconURL: user.avatarURL() }
      }))
        .setDescription(
          `**[PNG](${user.displayAvatarURL({ dynamic: true, size: 1024 }).replace("webp", "png")}) | [JPG](${user.displayAvatarURL({ dynamic: true, size: 1024 }).replace("webp", "jpg")}) | [WEBP](${user.displayAvatarURL({ dynamic: true, size: 1024 }).replace("webp", "webp")}) | [GIF](${user.displayAvatarURL({ dynamic: true, size: 1024 }).replace("webp", "gif")})**`
        )
        .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }));

      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Avatar komutu hatası:', err.message);
      await message.reply('❌ Bir hata oluştu.');
    }
  }
};
