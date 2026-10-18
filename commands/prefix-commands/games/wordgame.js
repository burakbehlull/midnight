import Manager from '#managers';
import { Economy } from '#models';
import { Button } from '#helpers';
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
      console.error('[wordgame] words.txt yüklenemedi:', err);
      wordsSet = new Set();
    }
  }
  return wordsSet;
}

const activeGames = new Set();

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

function getLastChars(word, count = 2) {
  const normalized = normalizeText(word);
  const letters = normalized.match(/[a-z]/g);
  return letters && letters.length >= count ? letters.slice(-count).join('') : null;
}

function getFirstChars(word, count = 2) {
  const normalized = normalizeText(word);
  const letters = normalized.match(/[a-z]/g);
  return letters && letters.length >= count ? letters.slice(0, count).join('') : null;
}

async function isValidWord(word) {
  const normalized = normalizeText(word);
  
  const words = loadWords();
  const inWordsTxt = words.has(normalized);
  
  if (inWordsTxt) {
    return true;
  }
  
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
        return false;
      }
    } else {
      console.log(`[wordgame] ⚠️ FreeDictionaryAPI HTTP Error: ${freeDictResponse.status} - Beraberlik`);
      return null;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log(`[wordgame] ⚠️ FreeDictionaryAPI Timeout (5s) - Beraberlik`);
    } else {
      console.log(`[wordgame] ⚠️ FreeDictionaryAPI Error: ${err.message} - Beraberlik`);
    }
    return null;
  }
}

export default {
  name: 'wordgame',
  category: 'fun',
  aliases: ['kelimeoyunu', 'kelime', 'wordg'],
  usage: '.wordgame @kullanıcı <miktar>',
  description: 'Rakibine karşı kelime türetme oyunu oyna!',
  
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const challenger = message.author;

    const targetUser = message.mentions.users.first() || client.users.cache.get(args[0]);
    const rawAmount = message.mentions.users.first() ? args[1] : args[1];
    const amount = parseInt(rawAmount);

    if (!targetUser) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Oynayacağın kullanıcıyı etiketle veya ID\'sini yaz.'));
    }

    if (isNaN(amount) || amount <= 0) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir bahis miktarı belirt.'));
    }

    if (targetUser.id === challenger.id) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Kendinle kelime oyunu oynayamazsın.'));
    }

    if (targetUser.bot) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Botlarla kelime oyunu oynayamazsın.'));
    }

    const MIN_BET = 100;
    if (amount < MIN_BET) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Minimum bahis **${MIN_BET}** coin.`));
    }

    if (activeGames.has(challenger.id) || activeGames.has(targetUser.id)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Siz veya rakibiniz zaten aktif bir oyunda.'));
    }

    let challengerData = await Economy.findOne({ userId: challenger.id });
    let targetData = await Economy.findOne({ userId: targetUser.id });

    if (!challengerData) {
      challengerData = new Economy({ userId: challenger.id });
      await challengerData.save().catch(() => {});
    }
    if (!targetData) {
      targetData = new Economy({ userId: targetUser.id });
      await targetData.save().catch(() => {});
    }

    if ((challengerData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Senin bakiyen yetersiz. Gereken: **${amount}** coin.`));
    }
    if ((targetData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Rakibin bakiyesi yetersiz. Gereken: **${amount}** coin.`));
    }

    activeGames.add(challenger.id);
    activeGames.add(targetUser.id);

    const gameId = `${challenger.id}_${targetUser.id}_${Date.now()}`;

    const modeBtns = new Button();
    modeBtns.add(`word_mode1_${gameId}`, 'Son 1 Harf', modeBtns.style.Primary, '1️⃣', false);
    modeBtns.add(`word_mode2_${gameId}`, 'Son 2 Harf', modeBtns.style.Primary, '2️⃣', false);
    const modeRow = modeBtns.build();

    const modeEmbed = manager.sender.embed({
      color: manager.sender.colors.blue,
      title: 'Oyun Modu Seçimi',
      description: 
        `<@${challenger.id}> **oyun modunu seç:**\n\n` +
        `**1️⃣ Son 1 Harf**\n` +
        `Önceki kelimenin son harfi ile başlayan kelime\n` +
        `Örnek: elma → **a**raba → **a**ğaç\n\n` +
        `**2️⃣ Son 2 Harf** (Daha zor)\n` +
        `Önceki kelimenin son 2 harfi ile başlayan kelime\n` +
        `Örnek: tam → **am**ca → **ca**mi\n\n` +
        `Bahis: ${amount} coin | Havuz: ${amount * 2} coin`,
      footer: { text: 'Bir mod seçin (30 saniye)' }
    });

    let confirmMsg;
    try {
      confirmMsg = await message.channel.send({ 
        content: `<@${challenger.id}>`, 
        embeds: [modeEmbed], 
        components: [modeRow] 
      });
    } catch (e) {
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }

    let gameMode = 2;
    try {
      const modeInteraction = await confirmMsg.awaitMessageComponent({
        filter: (i) => 
          (i.customId === `word_mode1_${gameId}` || i.customId === `word_mode2_${gameId}`) && 
          i.user.id === challenger.id,
        time: 30_000,
      });
      
      try { await modeInteraction.deferUpdate(); } catch (_) {}
      gameMode = modeInteraction.customId === `word_mode1_${gameId}` ? 1 : 2;
    } catch (e) {
      const timeoutEmbed = manager.sender.embed({
        color: manager.sender.colors.orange,
        title: '⏰ Süre Bitti',
        description: `Mod seçimi yapılmadı, oyun iptal edildi.`
      });
      try { await confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }); } catch (_) {}
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }

    const acceptBtns = new Button();
    acceptBtns.add(`word_accept_${gameId}`, 'Kabul Et', acceptBtns.style.Success, '✅', false);
    acceptBtns.add(`word_reject_${gameId}`, 'Reddet', acceptBtns.style.Danger, '❌', false);
    const acceptRow = acceptBtns.build();

    const offerEmbed = manager.sender.embed({
      color: manager.sender.colors.blue,
      title: 'Kelime Türetme Oyunu Teklifi',
      description: 
        `<@${challenger.id}> sana **${amount}** coin'lik kelime oyunu teklif etti!\n\n` +
        `**Mod:** Son ${gameMode} Harf\n\n` +
        `📜 **Kurallar:**\n` +
        `• Önceki kelimenin **son ${gameMode} harfi** ile başlayan kelime bul\n` +
        `• Her kelime minimum 3 harf olmalı\n` +
        `• Her tur için 60 saniye süren var\n` +
        `• Geçerli Türkçe kelime olmalı (TDK)\n` +
        `• Aynı kelime 2 kez kullanılamaz\n\n` +
        `**Bahis:** ${amount} coin | **Havuz:** ${amount * 2} coin\n\n` +
        `Kabul ediyor musun? (30 saniye)`,
      footer: { text: 'Kelime Türetme Oyunu' }
    });

    try {
      await confirmMsg.edit({ content: `<@${targetUser.id}>`, embeds: [offerEmbed], components: [acceptRow] });
    } catch (e) {
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }

    let offerAccepted = false;
    try {
      const acceptInteraction = await confirmMsg.awaitMessageComponent({
        filter: (i) => 
          (i.customId === `word_accept_${gameId}` || i.customId === `word_reject_${gameId}`) && 
          i.user.id === targetUser.id,
        time: 30_000,
      });
      
      try { await acceptInteraction.deferUpdate(); } catch (_) {}

      if (acceptInteraction.customId === `word_reject_${gameId}`) {
        const rejectEmbed = manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '❌ Teklif Reddedildi',
          description: `<@${targetUser.id}> teklifi reddetti.`
        });
        try { await confirmMsg.edit({ embeds: [rejectEmbed], components: [] }); } catch (_) {}
        activeGames.delete(challenger.id);
        activeGames.delete(targetUser.id);
        return;
      }
      offerAccepted = true;
    } catch (e) {
      const timeoutEmbed = manager.sender.embed({
        color: manager.sender.colors.orange,
        title: '⏰ Süre Bitti',
        description: `<@${targetUser.id}> 30 saniye içinde cevap vermedi, teklif iptal edildi.`
      });
      try { await confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }); } catch (_) {}
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }

    if (!offerAccepted) return;


    try {
      await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: -amount } });
      await Economy.findOneAndUpdate({ userId: targetUser.id }, { $inc: { money: -amount } });
    } catch (e) {
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bahis çekimi sırasında hata oluştu.'));
    }

 
    const pot = amount * 2;
    const players = [challenger, targetUser];
    let currentPlayerIndex = 0;
    let currentPlayer = players[currentPlayerIndex];
    const usedWords = new Set();
    let lastWord = null;
    let winner = null;
    let loser = null;
    let turnCount = 0;

  
    const resignBtn = new Button();
    resignBtn.add(`word_resign_${gameId}`, 'Pes Et', resignBtn.style.Danger, '🏳️', false);
    const resignRow = resignBtn.build();


    const startEmbed = manager.sender.embed({
      color: manager.sender.colors.green,
      title: '🎮 Kelime Türetme Oyunu Başladı!',
      description: 
        `<@${challenger.id}> vs <@${targetUser.id}>\n\n` +
        `**Mod:** Son ${gameMode} Harf\n\n` +
        `**Havuz:** ${pot} coin\n` +
        `**İlk oyuncu herhangi bir kelime yazabilir** (min 3 harf)\n\n` +
        `**Sıra:** <@${currentPlayer.id}>\n` +
        `**Süre:** 60 saniye`,
      footer: { text: 'Kelimeyi sohbet kanalına yazın!' }
    });

    try {
      await confirmMsg.edit({ content: '', embeds: [startEmbed], components: [resignRow] });
    } catch (e) {
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }

    while (!winner && !loser) {
      turnCount++;

      const filter = (m) => m.author.id === currentPlayer.id && !m.content.startsWith('.');
      
      let collected;
      try {
        const messagePromise = message.channel.awaitMessages({
          filter,
          max: 1,
          time: 60_000,
          errors: ['time']
        });

        const buttonPromise = confirmMsg.awaitMessageComponent({
          filter: (i) => i.customId === `word_resign_${gameId}` && i.user.id === currentPlayer.id,
          time: 60_000,
        });

        const result = await Promise.race([
          messagePromise.then(c => ({ type: 'message', data: c })),
          buttonPromise.then(i => ({ type: 'button', data: i }))
        ]);

        if (result.type === 'button') {
          try { await result.data.deferUpdate(); } catch (_) {}
          loser = currentPlayer;
          winner = players[currentPlayerIndex === 0 ? 1 : 0];
          break;
        } else {
          collected = result.data;
        }

      } catch (e) {
        loser = currentPlayer;
        winner = players[currentPlayerIndex === 0 ? 1 : 0];
        
        const timeoutEmbed = manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '⏰ Süre Doldu!',
          description: 
            `<@${currentPlayer.id}> 60 saniye içinde kelime yazmadı!\n\n` +
            `**Kazanan:** <@${winner.id}>\n` +
            `**Ödül:** ${pot.toLocaleString('tr-TR')} coin\n` +
            `**Toplam Kelime:** ${usedWords.size}`,
          footer: { text: `${challenger.username} vs ${targetUser.username}` }
        });
        
        try { await confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }); } catch (_) {}
        break;
      }

      const userMessage = collected.first();

      // İLK KONTROL: Boşluk var mı?
      if (userMessage.content.includes(' ')) {
        userMessage.react('❌');
        const warningMsg = await userMessage.reply({
          content: `❌ **Sadece tek kelime yazabilirsin!** Cümle değil, sadece bir kelime yaz.\n\n**Örnek:** \`araba\` ✅ | \`araba çok hızlı\` ❌`,
          allowedMentions: { repliedUser: false }
        });
        setTimeout(async () => {
          try {
            await userMessage.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        continue;
      }
      
      const words = userMessage.content.match(/[a-zA-ZığüşöçİĞÜŞÖÇ]+/g);
      
      if (!words || words.length === 0) {
        userMessage.react('❌');
        const warningMsg = await userMessage.reply({
          content: `❌ Geçersiz mesaj! Lütfen bir kelime yaz.`,
          allowedMentions: { repliedUser: false }
        });
        setTimeout(async () => {
          try {
            await userMessage.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        continue;
      }

      if (words.length > 1) {
        userMessage.react('❌');
        const warningMsg = await userMessage.reply({
          content: `❌ **Sadece tek kelime yazabilirsin!** Cümle değil, sadece bir kelime yaz.\n\n**Örnek:** \`araba\` ✅ | \`araba çok hızlı\` ❌`,
          allowedMentions: { repliedUser: false }
        });
        setTimeout(async () => {
          try {
            await userMessage.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        continue;
      }

      const word = words[0];
      const normalizedWord = normalizeText(word);

      if (!/^[a-zA-ZığüşöçİĞÜŞÖÇ]+$/.test(word)) {
        userMessage.react('❌'); // await kaldırıldı
        const warningMsg = await userMessage.reply({
          content: `❌ **Geçersiz karakter!** Kelime sadece harf içermelidir.`,
          allowedMentions: { repliedUser: false }
        });
        setTimeout(async () => {
          try {
            await userMessage.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        continue;
      }

      if (word.length < 3) {
        userMessage.react('❌');
        const warningMsg = await userMessage.reply({
          content: `❌ **Çok kısa!** Kelime en az 3 harf olmalı.`,
          allowedMentions: { repliedUser: false }
        });
        setTimeout(async () => {
          try {
            await userMessage.delete();
            await warningMsg.delete();
          } catch (err) {}
        }, 5000);
        continue;
      }

      if (usedWords.has(normalizedWord)) {
        userMessage.react('❌'); // await kaldırıldı
        loser = currentPlayer;
        winner = players[currentPlayerIndex === 0 ? 1 : 0];
        
        const usedEmbed = manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '❌ Kelime Daha Önce Kullanıldı!',
          description: 
            `<@${currentPlayer.id}> **"${word}"** kelimesini kullandı ama bu kelime zaten oyunda kullanılmıştı!\n\n` +
            `**Kazanan:** <@${winner.id}>\n` +
            `**Ödül:** ${pot.toLocaleString('tr-TR')} coin\n` +
            `**Toplam Kelime:** ${usedWords.size}`,
          footer: { text: `${challenger.username} vs ${targetUser.username}` }
        });
        
        try { await confirmMsg.edit({ embeds: [usedEmbed], components: [] }); } catch (_) {}
        setTimeout(async () => {
          try {
            await userMessage.delete();
          } catch (err) {}
        }, 5000);
        break;
      }

      if (lastWord) {
        const lastChars = getLastChars(lastWord, gameMode);
        const firstChars = getFirstChars(word, gameMode);

        if (!firstChars || lastChars !== firstChars) {
          userMessage.react('❌'); // await kaldırıldı
          loser = currentPlayer;
          winner = players[currentPlayerIndex === 0 ? 1 : 0];
          
          const wrongEmbed = manager.sender.embed({
            color: manager.sender.colors.liveRed,
            title: '❌ Yanlış Kelime!',
            description: 
              `<@${currentPlayer.id}> yanlış kelime yazdı!\n\n` +
              `**Son kelime:** ${lastWord}\n` +
              `**Başlaması gereken:** ${lastChars?.toUpperCase()}\n` +
              `**Senin kelimen:** ${word} (${firstChars?.toUpperCase()} ile başlıyor)\n\n` +
              `**Kazanan:** <@${winner.id}>\n` +
              `**Ödül:** ${pot.toLocaleString('tr-TR')} coin\n` +
              `**Toplam Kelime:** ${usedWords.size}`,
            footer: { text: `${challenger.username} vs ${targetUser.username}` }
          });
          
          try { await confirmMsg.edit({ embeds: [wrongEmbed], components: [] }); } catch (_) {}
          setTimeout(async () => {
            try {
              await userMessage.delete();
            } catch (err) {}
          }, 5000);
          break;
        }
      }

      const isValid = await isValidWord(word);
      
      if (isValid === null) {
        const apiErrorEmbed = manager.sender.embed({
          color: manager.sender.colors.orange,
          title: '⚠️ API Erişim Hatası - Beraberlik',
          description: 
            `Kelime doğrulama API'sine erişilemediği için oyun berabere bitti.\n\n` +
            `💸 Her iki oyuncuya da **${amount.toLocaleString('tr-TR')}** coin iade edildi.\n\n` +
            `📊 **İstatistikler:**\n` +
            `• Toplam Tur: ${turnCount}\n` +
            `• Kullanılan Kelime: ${usedWords.size}\n` +
            `• Son Kelime: ${lastWord || 'Yok'}\n\n` +
            `🔄 Lütfen tekrar deneyin!`,
          footer: { text: `${challenger.username} vs ${targetUser.username}` }
        });
        
        try { 
          await confirmMsg.edit({ embeds: [apiErrorEmbed], components: [] }); 
        } catch (_) {}
        
        try {
          await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: amount } });
          await Economy.findOneAndUpdate({ userId: targetUser.id }, { $inc: { money: amount } });
        } catch (e) {
          console.error('[wordgame] Para iadesi hatası:', e);
        }
        
        activeGames.delete(challenger.id);
        activeGames.delete(targetUser.id);
        return;
      }
      
      if (!isValid) {
        userMessage.react('❌');
        loser = currentPlayer;
        winner = players[currentPlayerIndex === 0 ? 1 : 0];
        
        const invalidEmbed = manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '❌ Geçersiz Kelime!',
          description: 
            `<@${currentPlayer.id}> geçersiz bir kelime yazdı!\n\n` +
            `**Kelime:** ${word}\n` +
            `Bu kelime sözlükte bulunamadı.\n\n` +
            `**Kazanan:** <@${winner.id}>\n` +
            `**Ödül:** ${pot.toLocaleString('tr-TR')} coin\n` +
            `**Toplam Kelime:** ${usedWords.size}`,
          footer: { text: `${challenger.username} vs ${targetUser.username}` }
        });
        
        try { await confirmMsg.edit({ embeds: [invalidEmbed], components: [] }); } catch (_) {}
        setTimeout(async () => {
          try {
            await userMessage.delete();
          } catch (err) {}
        }, 5000);
        break;
      }

      userMessage.react('✅');
      usedWords.add(normalizedWord);
      lastWord = word;

      currentPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
      currentPlayer = players[currentPlayerIndex];

      const turnEmbed = manager.sender.embed({
        color: currentPlayerIndex === 0 ? manager.sender.colors.blue : manager.sender.colors.orange,
        title: `🎮 Kelime Oyunu - Tur ${turnCount + 1}`,
        description: 
          `<@${challenger.id}> vs <@${targetUser.id}>\n\n` +
          `**Son Kelime:** ${lastWord}\n` +
          `**Başlamalı:** ${getLastChars(lastWord, gameMode)?.toUpperCase()}\n\n` +
          `**Havuz:** ${pot} coin\n` +
          `**Kullanılan Kelime:** ${usedWords.size}\n\n` +
          `**Sıra:** <@${currentPlayer.id}>\n` +
          `⏱**Süre:** 60 saniye`,
        footer: { text: 'Kelimeyi sohbet kanalına yazın!' }
      });

      try {
        await confirmMsg.edit({ embeds: [turnEmbed], components: [resignRow] });
      } catch (e) {
        console.error('[wordgame] Embed güncelleme hatası:', e);
      }
    }

    if (winner) {
      try {
        await Economy.findOneAndUpdate(
          { userId: winner.id },
          { $inc: { money: pot, xp: 25 } },
          { new: true }
        );

        await Economy.findOneAndUpdate(
          { userId: loser.id },
          { $inc: { xp: 5 } },
          { new: true }
        );
      } catch (e) {
        console.error('[wordgame] Ödül verme hatası:', e);
      }

      const winEmbed = manager.sender.embed({
        color: manager.sender.colors.green,
        title: 'Kelime Oyunu Bitti!',
        description: 
          `**Kazanan:** <@${winner.id}>\n` +
          `**Kazanılan:** ${pot.toLocaleString('tr-TR')} coin\n\n` +
          `**İstatistikler:**\n` +
          `• Toplam Tur: ${turnCount}\n` +
          `• Kullanılan Kelime: ${usedWords.size}\n` +
          `• Son Kelime: ${lastWord || 'Yok'}\n` +
          `• Oyun Modu: Son ${gameMode} Harf\n\n` +
          `**Kullanılan Kelimeler:**\n${Array.from(usedWords).join(' → ')}`,
        footer: { text: `${challenger.username} vs ${targetUser.username}` }
      });

      try { 
        await confirmMsg.edit({ embeds: [winEmbed], components: [] }); 
        
        await message.channel.send({
          content: `<@${winner.id}> **Kazandın!** 🏆\n\n💰 **${pot.toLocaleString('tr-TR')} coin** kazandın!`
        });
      } catch (_) {}
    }

    activeGames.delete(challenger.id);
    activeGames.delete(targetUser.id);
  },
};
