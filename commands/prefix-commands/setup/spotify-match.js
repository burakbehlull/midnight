import { Settings } from '#models';
import Manager from '#managers';

export default {
  name: 'spotify-match',
  aliases: ['spm', 'spotifymatch', 'spotifyeşleşme', 'eşleşme'],
  description: 'Spotify eşleşme sistemini açar/kapatır ve kanal ayarlar.',
  usage: 'spotify-match <on|off|set|status> [#kanal]',
  category: 'setup',
  cooldown: 5,

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;

    const ctrl = await manager.authority.checkOwnerAndBotOwners();
    if (!ctrl) return message.reply({ content: '❌ Bu komutu kullanmak owner olmalısın.', ephemeral: true });

    const action = (args[0] || '').toLowerCase();

    if (!action || action === 'help' || action === 'yardım') {
      const embed = sender.embed({
        title: '🎵 Spotify Eşleşme Sistemi',
        color: sender.colors.iceBlue,
        description: [
          'İki kullanıcı aynı anda aynı şarkıyı dinlediğinde eşleşme mesajı atan sistem.',
          '',
          '**Komutlar:**',
          '`.spotify-match on` — Sistemi açar',
          '`.spotify-match off` — Sistemi kapatır',
          '`.spotify-match set #kanal` — Eşleşme mesajlarının atılacağı kanalı ayarlar',
          '`.spotify-match status` — Mevcut durumu gösterir'
        ].join('\n')
      });
      return sender.reply(embed);
    }

    let settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings) {
      settings = new Settings({ guildId: message.guild.id });
    }

    if (action === 'on' || action === 'aç' || action === 'aktif') {
      settings.spotifyMatchEnabled = true;
      await settings.save();

      let extra = '';
      if (!settings.spotifyMatchChannelId) {
        extra = '\n\n⚠️ **Kanal ayarlanmamış!** Mesaj atılacak kanalı ayarlamak için: `.spotify-match set #kanal`';
      }

      return sender.reply(sender.embed({
        title: '✅ Spotify Eşleşme Açıldı',
        color: sender.colors.green,
        description: `Sistem başarıyla aktif edildi.${extra}`
      }));
    }

    if (action === 'off' || action === 'kapat' || action === 'pasif') {
      settings.spotifyMatchEnabled = false;
      await settings.save();

      return sender.reply(sender.embed({
        title: '❌ Spotify Eşleşme Kapatıldı',
        color: sender.colors.liveRed,
        description: 'Sistem başarıyla devre dışı bırakıldı.'
      }));
    }

    if (action === 'set' || action === 'ayarla' || action === 'kanal') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return sender.reply(sender.errorEmbed('❌ Lütfen bir kanal etiketleyin. Örn: `.spotify-match set #eşleşme`'));
      }

      settings.spotifyMatchChannelId = channel.id;
      if (!settings.spotifyMatchEnabled) {
        settings.spotifyMatchEnabled = true;
      }
      await settings.save();

      return sender.reply(sender.embed({
        title: '✅ Kanal Ayarlandı',
        color: sender.colors.green,
        description: `Eşleşme mesajları artık <#${channel.id}> kanalına atılacak.\n\nSistem otomatik olarak **açıldı**.`
      }));
    }

    if (action === 'status' || action === 'durum' || action === 'info' || action === 'bilgi') {
      const statusText = settings.spotifyMatchEnabled ? '✅ **Açık**' : '❌ **Kapalı**';
      const channelText = settings.spotifyMatchChannelId
        ? `<#${settings.spotifyMatchChannelId}>`
        : '⚠️ Ayarlanmamış';

      return sender.reply(sender.embed({
        title: '📊 Spotify Eşleşme Durumu',
        color: sender.colors.iceBlue,
        fields: [
          { name: 'Durum', value: statusText, inline: true },
          { name: 'Kanal', value: channelText, inline: true }
        ]
      }));
    }

    return sender.reply(sender.errorEmbed('❌ Geçersiz işlem. Kullanım: `.spotify-match <on|off|set|status>`'));
  }
};
