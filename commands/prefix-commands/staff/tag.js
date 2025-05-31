import Settings from '../../../models/Settings.js';

export default {
  name: 'tag',
  description: 'Sunucunun ayarlı olan tag bilgisini gösterir.',
  async execute(client, message, args) {
    try {
      const guildId = message.guild.id;
      const settings = await Settings.findOne({ guildId });

      if (!settings || !settings.tag) return message.reply('❌ Bu sunucu için ayarlanmış bir tag bulunamadı.');
      

      return message.reply(`**${settings.tag}**`);
	  
    } catch (err) {
      console.error('Tag komutu hatası:', err);
      return message.reply('❌ Tag alınırken bir hata oluştu.');
    }
  }
};
