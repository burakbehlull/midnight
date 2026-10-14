import { Events } from 'discord.js';
import { Settings, WordBuildingGame } from "#models";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


let wordsSet = null;
function loadWords() {
  if (!wordsSet) {
    try {
      const wordsPath = join(process.cwd(), 'data', 'words.txt');
      
      const content = readFileSync(wordsPath, 'utf-8');

      const lines = content.split(/\r?\n/);
      
      wordsSet = new Set(
        lines
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .filter(line => !line.includes(' ')) 
          .map(line => line.toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
          )
      );
      

    } catch (err) {
      console.error('[wordBuilding] words.txt yüklenemedi:', err);
      wordsSet = new Set();
    }
  }
  return wordsSet;
}

async function isValidWord(word) {
  const normalized = word.toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
  
  const words = loadWords();
  const inWordsTxt = words.has(normalized);
  
  if (inWordsTxt) {
    return true;
  }
    
  let freeDictResult = null;
  try {
    const freeDictController = new AbortController();
    const freeDictTimeout = setTimeout(() => freeDictController.abort(), 5000);
    
    const freeDictUrl = `https://freedictionaryapi.com/api/v1/entries/tr/${encodeURIComponent(word.toLowerCase())}`;
    const freeDictResponse = await fetch(freeDictUrl, {
      signal: freeDictController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(freeDictTimeout);
    
    if (freeDictResponse.ok) {
      const freeDictData = await freeDictResponse.json();
      if (freeDictData.entries && Array.isArray(freeDictData.entries) && freeDictData.entries.length > 0) {
        return true;
      } else {
        freeDictResult = false;
      }
    } else {
      console.log(`[wordBuilding] ⚠️ FreeDictionaryAPI HTTP Error: ${freeDictResponse.status}`);
      freeDictResult = null;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log(`[wordBuilding] ⚠️ FreeDictionaryAPI Timeout (5s)`);
    } else {
      console.log(`[wordBuilding] ⚠️ FreeDictionaryAPI Error: ${err.message}`);
    }
    freeDictResult = null;
  }
  
  let tdkResult = null;
  try {
    const tdkController = new AbortController();
    const tdkTimeout = setTimeout(() => tdkController.abort(), 5000);
    
    const tdkUrl = `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(word)}`;
    const tdkResponse = await fetch(tdkUrl, {
      signal: tdkController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(tdkTimeout);
    
    if (tdkResponse.ok) {
      const tdkData = await tdkResponse.json();
      if (Array.isArray(tdkData) && tdkData.length > 0) {
        return true;
      } else {
        tdkResult = false;
      }
    } else {
      console.log(`[wordBuilding] ⚠️ TDK HTTP Error: ${tdkResponse.status}`);
      tdkResult = null;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log(`[wordBuilding] ⚠️ TDK Timeout (5s)`);
    } else {
      console.log(`[wordBuilding] ⚠️ TDK Error: ${err.message}`);
    }
    tdkResult = null;
  }
  
  if (!inWordsTxt && freeDictResult === false && tdkResult === false) {
    return false;
  }
  
  if (freeDictResult === null || tdkResult === null) {
    return null;
  }
  
  return false;
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
        message.react('❌');
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
        message.react('❌');
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
        message.react('❌'); 
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
        message.react('❌'); 
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
        message.react('❌'); 
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

      if (isValid === null) {
        message.react('⚠️');
        await message.reply({
          content: `⚠️ **TDK sözlüğüne erişilemiyor!** Kelime geçici olarak kabul edildi.\n\n📝 **Kelime:** ${currentWord}\n💡 TDK bağlantısı tekrar kurulana kadar tüm kelimeler kabul edilecek.`,
          allowedMentions: { repliedUser: false }
        });
        

        if (!game.lastWord) {
          game.lastWord = currentWord;
          game.lastUserId = message.author.id;
          game.lastMessageId = message.id;
          game.usedWords.push(normalizedWord);
          game.totalWords = 1;
          await game.save();
          return;
        }
        
 
        const lastChar = getLastChar(game.lastWord);
        const firstChar = getFirstChar(currentWord);
        
        if (lastChar === firstChar) {
          game.lastWord = currentWord;
          game.lastUserId = message.author.id;
          game.lastMessageId = message.id;
          game.usedWords.push(normalizedWord);
          game.totalWords += 1;
          await game.save();
        } else {
          message.react('❌');
          const warningMsg = await message.reply({
            content: 
              `**Yanlış kelime!**\n\n` +
              `🔤 Son harf: **${lastChar.toUpperCase()}**\n`,
            allowedMentions: { repliedUser: false }
          });
          
          setTimeout(async () => {
            try {
              await message.delete();
              await warningMsg.delete();
            } catch (err) {}
          }, 5000);
        }
        return;
      }
      
      if (!isValid) {
        message.react('❌');
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

        message.react('✅');
        await message.reply({
          content: `**İlk kelime kabul edildi!** Oyun başladı!\n\n **Sonraki kelime ${getLastChar(currentWord)?.toUpperCase()} harfi ile başlamalı**`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const lastChar = getLastChar(game.lastWord);
      const firstChar = getFirstChar(currentWord);

      if (!lastChar || !firstChar) {
        message.react('❌');
        return;
      }

      if (lastChar === firstChar) {
        game.lastWord = currentWord;
        game.lastUserId = message.author.id;
        game.lastMessageId = message.id;
        game.usedWords.push(normalizedWord);
        game.totalWords += 1;
        await game.save();

        message.react('✅');
        

      } else {
        message.react('❌');
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
