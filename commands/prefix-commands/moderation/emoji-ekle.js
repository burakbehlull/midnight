import { messageSender } from '#helpers';
import { PermissionsManager } from '#managers';

export default {
  name: 'emoji-yükle',
  aliases: ['emojiekle', 'emojiyükle'],
  description: 'Bir emoji veya bağlantı ile sunucuya emoji ekler.',
  usage: 'emoji-yükle <emoji | url> <isim>',
  async execute(client, message, args) {
	const PM = new PermissionsManager(message);
    const sender = new messageSender(message);

    if (!message.guild) return;
	
	const ctrl = await PM.control(PM.flags.ManageEmojisAndStickers, PM.flags.Administrator)
	if (!ctrl) return sender.reply(sender.errorEmbed("❌ Yetkin yok."));

    const [emojiInput, emojiName] = args;

    if (!emojiInput || !emojiName) {
      return sender.reply(sender.errorEmbed('❌ Doğru kullanım: `.emoji-yükle <emoji | bağlantı> <isim>`'));
    }

    let emojiUrl;

    if (emojiInput.startsWith('http')) {
      emojiUrl = emojiInput;
    } else {
      try {
        const emojiId = emojiInput.split(':')[2]?.replace('>', '');
        if (!emojiId) throw new Error('Geçersiz emoji formatı.');
        const isAnimated = emojiInput.startsWith('<a:');
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?v=1`;
      } catch (err) {
        return sender.reply(sender.errorEmbed('❌ Geçerli bir emoji veya bağlantı girin.'));
      }
    }

    try {
      const createdEmoji = await message.guild.emojis.create({ attachment: emojiUrl, name: emojiName });
      return sender.reply(sender.classic(`Emoji yüklendi: <${createdEmoji.animated ? 'a' : ''}:${createdEmoji.name}:${createdEmoji.id}> ${emojiName || ''}`));
    } catch (error) {
      console.error('Emoji yükleme hatası:', error);
      return sender.reply(sender.errorEmbed('❌ Emoji yüklenemedi. Lütfen geçerli bir bağlantı veya emoji girdiğinizden emin olun.'));
    }
  }
};
