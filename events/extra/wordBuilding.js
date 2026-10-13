import { Events } from 'discord.js';
import { Settings, WordBuildingGame } from "#models";

async function isValidWord(word) {
  try {
    const response = await fetch(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(word)}`);
    const data = await response.json();
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.error('[wordBuilding] TDK API Error:', err);
    return false;
  }
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function getLastChar(word) {
  const normalized = normalizeText(word);
  const letters = normalized.match(/[a-z]/g);
  return letters ? letters[letters.length - 1] : null;
}

function getFirstChar(word) {
  const normalized = normalizeText(word);
  const letters = normalized.match(/[a-z]/g);
  return letters ? letters[0] : null;
}

export default {
  name: Events.MessageCreate,
  async execute(client, message) {
    if (message.author.bot) return;
    if (message.content.startsWith('.')) return;

    try {
      const settings = await Settings.findOne({ guildId: message.guild?.id });
      
      if (!settings?.wordBuildingChannelId || message.channel.id !== settings.wordBuildingChannelId) {
        return;
      }

      const words = message.content.match(/[a-zA-ZığüşöçİĞÜŞÖÇ]+/g);
      
      if (!words || words.length === 0) {
        await message.react('❌');
        const warningMsg = await message.reply({
          content: `❌ **Geçersiz mesaj!** Lütfen geçerli bir kelime yazın.`,
          allowedMentions: { repliedUser: false }
        });
        
        setTimeout(async () => {
          try {
            await message.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        return;
      }

      const currentWord = words[0];
      
      if (currentWord.length < 3) {
        await message.react('❌');
        const warningMsg = await message.reply({
          content: `❌ **Çok kısa!** Kelime en az 3 harf olmalı.`,
          allowedMentions: { repliedUser: false }
        });
        
        setTimeout(async () => {
          try {
            await message.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        return;
      }

      if (!/^[a-zA-ZığüşöçİĞÜŞÖÇ]+$/.test(currentWord)) {
        await message.react('❌');
        const warningMsg = await message.reply({
          content: `❌ **Geçersiz karakter!** Kelime sadece harf içermelidir.`,
          allowedMentions: { repliedUser: false }
        });
        
        setTimeout(async () => {
          try {
            await message.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        return;
      }

      let game = await WordBuildingGame.findOne({
        guildId: message.guild.id,
        channelId: message.channel.id
      });

      if (!game) {
        game = new WordBuildingGame({
          guildId: message.guild.id,
          channelId: message.channel.id,
          lastWord: null,
          lastUserId: null,
          usedWords: [],
          totalWords: 0
        });
      }

      if (game.lastUserId === message.author.id) {
        await message.react('❌');
        const warningMsg = await message.reply({
          content: `❌ **Sıra sende değil!** Başka bir kullanıcının kelime yazmasını bekle.`,
          allowedMentions: { repliedUser: false }
        });
        
        setTimeout(async () => {
          try {
            await message.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        return;
      }

      const normalizedWord = normalizeText(currentWord);

      if (game.usedWords.includes(normalizedWord)) {
        await message.react('❌');
        const warningMsg = await message.reply({
          content: `❌ **Bu kelime daha önce kullanıldı!** Farklı bir kelime yazın.`,
          allowedMentions: { repliedUser: false }
        });
        
        setTimeout(async () => {
          try {
            await message.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        return;
      }

      const isValid = await isValidWord(currentWord);
      if (!isValid) {
        await message.react('❌');
        const warningMsg = await message.reply({
          content: `❌ **Geçersiz kelime!** "${currentWord}" TDK sözlüğünde bulunamadı.`,
          allowedMentions: { repliedUser: false }
        });
        
        setTimeout(async () => {
          try {
            await message.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        return;
      }

      if (!game.lastWord) {
        game.lastWord = currentWord;
        game.lastUserId = message.author.id;
        game.lastMessageId = message.id;
        game.usedWords.push(normalizedWord);
        game.totalWords = 1;
        await game.save();

        await message.react('✅');
        await message.reply({
          content: `**İlk kelime kabul edildi!** Oyun başladı!\n\n **Sonraki kelime ${getLastChar(currentWord)?.toUpperCase()} harfi ile başlamalı**`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const lastChar = getLastChar(game.lastWord);
      const firstChar = getFirstChar(currentWord);

      if (!lastChar || !firstChar) {
        await message.react('❌');
        return;
      }

      if (lastChar === firstChar) {
        game.lastWord = currentWord;
        game.lastUserId = message.author.id;
        game.lastMessageId = message.id;
        game.usedWords.push(normalizedWord);
        game.totalWords += 1;
        await game.save();

        await message.react('✅');
        

      } else {
        await message.react('❌');
        const warningMsg = await message.reply({
          content: 
            `**Yanlış kelime!**\n\n` +
            `Son kelime: **${game.lastWord}**\n` +
            `Son harf: **${lastChar.toUpperCase()}**\n` +
            `Senin kelimen **${firstChar.toUpperCase()}** ile başlıyor!\n\n` +
            `Kelimen **${lastChar.toUpperCase()}** ile başlamalıydı.\n\n` +
            `**Toplam kelime:** ${game.totalWords}`,
          allowedMentions: { repliedUser: false }
        });
        
        setTimeout(async () => {
          try {
            await message.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
      }

    } catch (error) {
      console.error('[wordBuilding] Hata:', error);
    }
  }
};
