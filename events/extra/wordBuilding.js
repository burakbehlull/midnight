import { Events } from 'discord.js';
import { Settings, WordBuildingGame } from "#models";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// words.txt dosyasını yükle (başlangıçta bir kez)
let wordsSet = null;
function loadWords() {
  if (!wordsSet) {
    try {
      const wordsPath = join(__dirname, '../../../data/words.txt');
      const content = readFileSync(wordsPath, 'utf-8');
      wordsSet = new Set(
        content
          .split('\n')
          .map(line => line.trim().toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
          )
          .filter(line => line.length > 0)
      );
      console.log(`[wordBuilding] ${wordsSet.size} kelime yüklendi (words.txt)`);
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
  
  // Önce words.txt'ye bak (hızlı)
  const words = loadWords();
  if (words.has(normalized)) {
    console.log(`[wordBuilding] Kelime bulundu (words.txt): "${word}"`);
    return true;
  }
  
  // words.txt'de yoksa TDK API'ye sor
  try {
    // 5 saniye timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const startTime = Date.now();
    const response = await fetch(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(word)}`, {
      signal: controller.signal
    });
    const elapsed = Date.now() - startTime;
    clearTimeout(timeoutId);
    
    console.log(`[wordBuilding] TDK yanıt süresi: ${elapsed}ms - Kelime: "${word}"`);
    
    const data = await response.json();
    const isValid = Array.isArray(data) && data.length > 0;
    
    if (isValid) {
      console.log(`[wordBuilding] Kelime bulundu (TDK): "${word}"`);
    } else {
      console.log(`[wordBuilding] Kelime bulunamadı (TDK + words.txt): "${word}"`);
    }
    
    return isValid;
  } catch (err) {
    // TDK hatası - words.txt'de zaten kontrol ettik, yoktu
    if (err.name === 'AbortError') {
      console.log(`[wordBuilding] TDK Timeout (5s) - Kelime: "${word}" - words.txt'de yok`);
    } else {
      console.log(`[wordBuilding] TDK API Error - Kelime: "${word}" - words.txt'de yok`);
    }
    // TDK'ya ulaşılamadı VE words.txt'de de yok = null döndür
    return null;
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
        message.react('❌'); // await kaldırıldı
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
        message.react('❌'); // await kaldırıldı
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
        message.react('❌'); // await kaldırıldı
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
        message.react('❌'); // await kaldırıldı
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
        message.react('❌'); // await kaldırıldı
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
      
      // TDK erişilemezse uyarı ver ama kelimeyi kabul et
      if (isValid === null) {
        message.react('⚠️');
        await message.reply({
          content: `⚠️ **TDK sözlüğüne erişilemiyor!** Kelime geçici olarak kabul edildi.\n\n📝 **Kelime:** ${currentWord}\n💡 TDK bağlantısı tekrar kurulana kadar tüm kelimeler kabul edilecek.`,
          allowedMentions: { repliedUser: false }
        });
        
        // Kelimeyi kabul et (TDK olmadan devam et)
        if (!game.lastWord) {
          game.lastWord = currentWord;
          game.lastUserId = message.author.id;
          game.lastMessageId = message.id;
          game.usedWords.push(normalizedWord);
          game.totalWords = 1;
          await game.save();
          return;
        }
        
        // Son harfle başlama kontrolü yap
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
              `❌ **Yanlış kelime!**\n\n` +
              `📝 Son kelime: **${game.lastWord}**\n` +
              `🔤 Son harf: **${lastChar.toUpperCase()}**\n` +
              `❗ Senin kelimen **${firstChar.toUpperCase()}** ile başlıyor!\n\n` +
              `✅ Kelimen **${lastChar.toUpperCase()}** ile başlamalıydı.`,
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
        message.react('❌'); // await kaldırıldı
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

        message.react('✅'); // await kaldırıldı - hızlı olsun
        await message.reply({
          content: `**İlk kelime kabul edildi!** Oyun başladı!\n\n **Sonraki kelime ${getLastChar(currentWord)?.toUpperCase()} harfi ile başlamalı**`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const lastChar = getLastChar(game.lastWord);
      const firstChar = getFirstChar(currentWord);

      if (!lastChar || !firstChar) {
        message.react('❌'); // await kaldırıldı
        return;
      }

      if (lastChar === firstChar) {
        game.lastWord = currentWord;
        game.lastUserId = message.author.id;
        game.lastMessageId = message.id;
        game.usedWords.push(normalizedWord);
        game.totalWords += 1;
        await game.save();

        message.react('✅'); // await kaldırıldı
        

      } else {
        message.react('❌'); // await kaldırıldı
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
