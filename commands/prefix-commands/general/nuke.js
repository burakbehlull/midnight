import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'nuke',
  description: 'Bulunduğun ya da belirttiğin metin kanalını yeniler.',
  usage: 'nuke [#kanal]',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
	  const sender = new messageSender(message);
      // Kanalı belirle
      const channel = message.mentions.channels.first() || message.channel;

      const channelPosition = channel.position;
      const channelName = channel.name;
      const channelTopic = channel.topic || '';
      const channelParentId = channel.parentId;
      const user = message.author;

      // Yetki kontrolleri
      const ctrl = await PM.control(PM.flags.Administrator);
	  if (!ctrl) return sedner.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));


      if (!channel.isTextBased?.()) return sender.reply(sender.errorEmbed('❌ Bu komut yalnızca metin kanallarında kullanılabilir.'));
    

      // Kanalı sil ve yeniden oluştur
      await channel.delete().catch(err => {
        return sender.reply(sender.errorEmbed(`❌ Kanal silinirken bir hata oluştu: ${err.message}`));
      });

      const newChannel = await message.guild.channels.create({
        name: channelName,
        type: channel.type,
        topic: channelTopic,
        parent: channelParentId,
        position: channelPosition
      });

      await newChannel.send(`**Kanal yenilendi.** \`${user.username}\``);

    } catch (err) {
      console.error('Nuke komutu hatası:', err.message);
      sender.reply(sender.errorEmbed('❌ Bir hata oluştu. Konsolu kontrol et.'));
    }
  }
};
