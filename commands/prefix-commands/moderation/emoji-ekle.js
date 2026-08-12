import Manager from '#managers';

export default {
  name: 'emoji',
  aliases: ['emojiekle', 'emojiyükle', 'emoji-ekle'],
  description: 'Bir emoji veya bağlantı ile sunucuya emoji ekler.',
  usage: 'emoji-yükle <emoji | url> <isim>',
  category: 'server',  
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });

    if (!message.guild) return;

    const [emojiInput, emojiName] = args;

    if (!emojiInput || !emojiName) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Doğru kullanım: `.emoji-yükle <emoji | bağlantı> <isim>`'));
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
        return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir emoji veya bağlantı girin.'));
      }
    }

    try {
      const createdEmoji = await message.guild.emojis.create({ attachment: emojiUrl, name: emojiName });
      return manager.sender.reply(manager.sender.classic(`Emoji yüklendi: <${createdEmoji.animated ? 'a' : ''}:${createdEmoji.name}:${createdEmoji.id}> ${emojiName || ''}`));
    } catch (error) {
      console.error('Emoji yükleme hatası:', error);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Emoji yüklenemedi. Lütfen geçerli bir bağlantı veya emoji girdiğinizden emin olun.'));
    }
  }
};
