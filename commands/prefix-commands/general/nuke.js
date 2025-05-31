import { PermissionsManager } from '../../../managers/index.js';

export default {
  name: 'nuke',
  description: 'Bulunduğun ya da belirttiğin metin kanalını yeniler.',
  usage: 'nuke [#kanal]',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);

      // Kanalı belirle
      const channel = message.mentions.channels.first() || message.channel;

      const channelPosition = channel.position;
      const channelName = channel.name;
      const channelTopic = channel.topic || '';
      const channelParentId = channel.parentId;
      const user = message.author;

      // Yetki kontrolleri
      const IsRoles = await PM.isRoles();
      const IsOwner = await PM.isOwner();
      const IsAuthority = await PM.isAuthority(PM.flags.BanMembers, PM.flags.Administrator);

      const checks = [];
      if (PM.permissions.isRole) checks.push(IsRoles);
      if (PM.permissions.isOwners) checks.push(IsOwner);
      if (PM.permissions.isAuthority) checks.push(IsAuthority);

      const hasAtLeastOnePermission = checks.includes(true);

      if (!hasAtLeastOnePermission) {
        return message.reply('❌ Bu komutu kullanmak için yeterli yetkin yok.');
      }

      if (!channel.isTextBased?.()) {
        return message.reply('❌ Bu komut yalnızca metin kanallarında kullanılabilir.');
      }

      // Kanalı sil ve yeniden oluştur
      await channel.delete().catch(err => {
        return message.reply(`❌ Kanal silinirken bir hata oluştu: ${err.message}`);
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
      message.reply('❌ Bir hata oluştu. Konsolu kontrol et.');
    }
  }
};
