import { EmbedBuilder } from 'discord.js';
import { messageSender } from '#helpers';

export default {
  name: 'banner',
  description: 'Etiketlenen kullanıcının veya kendi bannerını gösterir.',
  usage: 'banner @kullanıcı',
  async execute(client, message, args) {
    const sender = new messageSender(message);
    const user = message.mentions.users.first() || message.author;

    try {
      const fetchedUser = await client.users.fetch(user.id, { force: true });
      const bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 1024 });

      if (!bannerURL) {
        return sender.reply(sender.errorEmbed('❌ Kullanıcının bir bannerı yok.'));
      }

      const embed = new EmbedBuilder(sender.embed({
        title: 'Banner',
        footer: { text: fetchedUser.username, iconURL: fetchedUser.displayAvatarURL() }
      }))
        .setImage(bannerURL)
        .setDescription(
          `**[PNG](${bannerURL.replace("webp", "png")}) | [JPG](${bannerURL.replace("webp", "jpg")}) | [WEBP](${bannerURL.replace("webp", "webp")}) | [GIF](${bannerURL.replace("webp", "gif")})**`
        );

      await message.channel.send({ embeds: [embed] });

    } catch (err) {
      console.error('Banner komutu hatası:', err.message);
      return sender.reply(sender.errorEmbed('❌ Banner alınırken bir hata oluştu.'));
    }
  }
};
