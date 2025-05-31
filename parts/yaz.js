import { PermissionsManager } from '../../managers/index.js';

export default {
  name: 'yaz',
  description: 'Bot belirtilen mesajı yazar.',
  usage: 'yaz <mesaj>',
  async execute(client, message, args) {
    const text = args.join(' ');
	
	const PM = new PermissionsManager(message);
	  
    const ctrl = await PM.control(PM.flags.Administrator)
	if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');

    if (!text) {
      return message.reply('❌ Lütfen yazmamı istediğin bir mesaj belirt.');
    }

    try {
      await message.channel.send(text);
      if (message.deletable) await message.delete(); // Komutu yazanı sil
    } catch (err) {
      console.error('Yaz komutu hatası:', err);
      return message.reply('❌ Mesajı gönderirken bir hata oluştu.');
    }
  }
};
