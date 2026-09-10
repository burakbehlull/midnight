import Manager from '#managers';

export default {
  name: 'client-yükle',
  aliases: ['clientyükle', 'app-load', 'appload'],
  description: 'Botun uygulama emojilerine emoji yükler (tüm sunucularda kullanılabilir).',
  usage: 'client-yükle emoji <emoji | bağlantı> <isim>',
  category: 'client',

  permissions: {
    authorities: [],
    user: ['470548458072440842'],
    roles: []
  },

  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });

      const ctrl = await manager.authority.checkIsBotOwners();
      if (!ctrl) return message.reply({ content: '❌ Bu komutu kullanmak bot sahibi olmalısın.', ephemeral: true });


      const subCommand = args[0]?.toLowerCase();

      if (!subCommand || subCommand !== 'emoji') {
        return manager.sender.reply(
          manager.sender.errorEmbed(
            '❌ Doğru kullanım: `.client-yükle emoji <emoji | bağlantı> <isim>`'
          )
        );
      }

      const emojiInput = args[1];
      const emojiName = args[2];

      if (!emojiInput || !emojiName) {
        return manager.sender.reply(
          manager.sender.errorEmbed(
            '❌ Eksik argüman!\n\nKullanım: `.client-yükle emoji <emoji | bağlantı> <isim>`\n\nÖrnekler:\n`.client-yükle emoji :example: benimEmojim`\n`.client-yükle emoji https://example.com/resim.png logo`'
          )
        );
      }

      if (!/^[a-zA-Z0-9_]{2,32}$/.test(emojiName)) {
        return manager.sender.reply(
          manager.sender.errorEmbed(
            '❌ Emoji ismi geçersiz!\n\nKurallar:\n- En az 2, en fazla 32 karakter\n- Sadece harf, rakam ve alt çizgi (_) içerebilir'
          )
        );
      }

      let emojiUrl;

      if (emojiInput.startsWith('http')) {
        emojiUrl = emojiInput;
      } else {
        try {
          const parsed = emojiInput.match(/^<?(a)?:?(\w{2,32}):(\d{17,20})>?/);
          if (!parsed) throw new Error('Geçersiz emoji formatı');

          const isAnimated = parsed[1] === 'a';
          const emojiId = parsed[3];
          emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?v=1&size=128`;
        } catch (err) {
          return manager.sender.reply(
            manager.sender.errorEmbed(
              '❌ Geçerli bir özel emoji veya doğrudan resim bağlantısı girin.\n\nNot: Sadece **özel emojiler** çalışır, ✅ gibi varsayılan emojiler çalışmaz.'
            )
          );
        }
      }

      const loadingMsg = await manager.sender.reply(
        manager.sender.classic('⏳ Emoji botun uygulama emojilerine yükleniyor...')
      );

      try {
        const createdEmoji = await client.application.emojis.create({
          attachment: emojiUrl,
          name: emojiName,
        });

        const emojiFormat = `<${createdEmoji.animated ? 'a' : ''}:${createdEmoji.name}:${createdEmoji.id}>`;

        if (loadingMsg && loadingMsg.edit) {
          await loadingMsg.edit({
            content: null,
            embeds: [
              manager.sender.classic(
                `✅ Emoji başarıyla yüklendi!\n\n` +
                `**Görsel:** ${emojiFormat}\n` +
                `**İsim:** \`${createdEmoji.name}\`\n` +
                `**ID:** \`${createdEmoji.id}\`\n` +
                `**Format:** \`${emojiFormat}\`\n\n` +
                `💡 Mesajlarda kullanmak için: \`:${createdEmoji.name}:\` yazabilirsin.`
              )
            ],
          });
        }
      } catch (uploadErr) {
        console.error('Application emoji yükleme hatası:', uploadErr);

        let errorMsg = '❌ Emoji yüklenemedi!';
        const errText = uploadErr.toString().toLowerCase();

        if (errText.includes('2000') || errText.includes('maximum') || errText.includes('limit')) {
          errorMsg += '\n\n📛 **Neden:** Botun uygulama emoji limiti (2000) dolu.';
        } else if (errText.includes('256') || errText.includes('file size') || errText.includes('too large')) {
          errorMsg += '\n\n📛 **Neden:** Resim boyutu 256 KB\'dan büyük.';
        } else if (errText.includes('invalid image') || errText.includes('unsupported') || errText.includes('format')) {
          errorMsg += '\n\n📛 **Neden:** Desteklenmeyen dosya formatı. Sadece PNG, JPG, GIF, WEBP kullan.';
        } else if (errText.includes('permission') || errText.includes('401') || errText.includes('403')) {
          errorMsg += '\n\n📛 **Neden:** Botun uygulama izinleri eksik. Developer Portal\'dan Emojiler iznini kontrol et.';
        } else {
          errorMsg += `\n\nHata detayı: \`${uploadErr.message || uploadErr.toString().slice(0, 100)}\``;
        }

        if (loadingMsg && loadingMsg.edit) {
          await loadingMsg.edit({
            content: null,
            embeds: [manager.sender.errorEmbed(errorMsg)],
          });
        }
      }
    } catch (err) {
      console.error('client-yükle komut hatası:', err);
    }
  },
};
