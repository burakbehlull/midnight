import Manager from '#managers';
import { Economy } from '#models';
import { Button, misc } from '#helpers';

const { delay } = misc;

const FISH_BY_TIER = {
  tier1: [
    { emoji: '🗑️', name: 'Teneke Kutu' },
    { emoji: '🥫', name: 'Bozulmuş Konserve' },
    { emoji: '👟', name: 'Eski Ayakkabı' },
  ],
  tier2: [
    { emoji: '🐟', name: 'Sazan' },
    { emoji: '🐠', name: 'Çipura' },
    { emoji: '🐡', name: 'Levrek' },
    { emoji: '🦐', name: 'Karides' },
  ],
  tier3: [
    { emoji: '🦈', name: 'Küçük Köpek Balığı' },
    { emoji: '🐟', name: 'Somon' },
    { emoji: '💛', name: 'Altın Çipura' },
  ],
  tier4: [
    { emoji: '🐙', name: 'Ahtapot' },
    { emoji: '🦀', name: 'Büyük Yengeç' },
    { emoji: '🦑', name: 'Kalamar' },
    { emoji: '🦞', name: 'Istakoz' },
  ],
  tier5: [
    { emoji: '🚢', name: 'Gemi Batığı' },
    { emoji: '🧜‍♀️', name: 'Deniz Kızı' },
    { emoji: '🐡', name: 'Efsanevi Altın Balık' },
  ],
};

const TIER_WEIGHTS = {
  tier1: 50,
  tier2: 28,
  tier3: 14,
  tier4: 6,
  tier5: 2,
};

const TIER_BASE_MULT = {
  tier1: 0,
  tier2: 1.0,
  tier3: 2.8,
  tier4: 4.5,
  tier5: 9.0,
};

const TIER_NAMES = {
  tier1: 'Çöp Seviyesi',
  tier2: 'Yaygın',
  tier3: 'Nadir',
  tier4: 'Efsane',
  tier5: 'JACKPOT EFSANEVİ',
};

const TIER_COLORS = {
  tier1: 'darkRed',
  tier2: 'mintGreen',
  tier3: 'blue',
  tier4: 'purple',
  tier5: 'gold',
};

const MIN_BET = 50;
const MAX_BET = 50000;
const ALL_KEYWORDS = ['all', 'max', 'tüm', 'hepsi'];
const ACTIVE_SESSIONS = new Set();

function pickWeightedTier() {
  const entries = Object.entries(TIER_WEIGHTS);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [tier, w] of entries) {
    if (r < w) return tier;
    r -= w;
  }
  return 'tier2';
}

function pickFish(tier) {
  const fishes = FISH_BY_TIER[tier] || FISH_BY_TIER.tier2;
  return fishes[Math.floor(Math.random() * fishes.length)];
}

function randomWeight() {
  return 0.4 + Math.random() * 9.5;
}

function calcTotalMult(tier, weightKg) {
  const base = TIER_BASE_MULT[tier] || 0;
  if (tier === 'tier1') return 0;
  const weightBoost = 1 + (weightKg / 12);
  return base * weightBoost;
}

function scoreFish(tier, weightKg) {
  const tierScore = { tier1: 1, tier2: 3, tier3: 6, tier4: 9, tier5: 13 }[tier] || 1;
  return tierScore * (1 + weightKg / 10);
}

function fmtMoney(x) {
  return Number(x).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

function fmtWeight(x) {
  return x.toFixed(3);
}

export default {
  name: 'balik-tut',
  aliases: ['baliktut', 'bt', 'fish', 'balik', 'tut', 'balık-tut', 'balıktut', 'go-fishing', 'gofishing'],
  category: 'games',
  permissions: { enabled: false },
  async execute(client, message, args) {
    console.log(`[balik-tut] KOMUT ÇALIŞTIRILDI ✅ | Kullanıcı: ${message.author.tag} | args:`, args);
    const manager = new Manager(client, { action: message });

    const challenger = message.author;
    let target = null;
    let betArg = args[0];

    const mentionFromMsg = message.mentions?.users?.first() || null;
    if (mentionFromMsg) {
      target = mentionFromMsg;
      betArg = args[1] || args[0];
    } else if (args[0] && /^<@!?(\d+)>$/.test(args[0])) {
      const idMatch = args[0].match(/^<@!?(\d+)>$/);
      const uid = idMatch?.[1];
      if (uid) {
        target = await client.users.fetch(uid).catch(() => null) || client.users.cache.get(uid) || null;
        betArg = args[1] || args[0];
      }
    }

    console.log('[balik-tut] Target:', target?.tag || 'yok', '| betArg:', betArg);

    if (!betArg) {
      return message.reply({
        embeds: [{
          title: '❌ Eksik Argüman',
          description:
            '**Tek Kişilik:** `.bt 500` veya `.bt all`\n' +
            '**2 Kişilik:** `.bt @Kullanıcı 1000`',
          color: 0xef4444,
        }]
      });
    }

    if (target) {
      if (target.bot) {
        return message.reply({
          embeds: [{
            title: '❌ Botlarla Oyun Oynanmaz',
            color: 0xef4444,
          }]
        });
      }
      if (target.id === challenger.id) {
        return message.reply({
          embeds: [{
            title: '❌ Kendinle Oyun Oynayamazsın',
            color: 0xef4444,
          }]
        });
      }
    }

    if (ACTIVE_SESSIONS.has(challenger.id)) {
      return message.reply({
        embeds: [{
          title: '❌ Zaten Aktif Bir Oyunun Var',
          description: 'Mevcut balık tutma oyunun bitene kadar yeni bir oyun başlatamazsın.',
          color: 0xef4444,
        }]
      });
    }
    if (target && ACTIVE_SESSIONS.has(target.id)) {
      return message.reply({
        embeds: [{
          title: '❌ Rakip Oyun Oynuyor',
          description: 'Rakibin şu an başka bir balık tutma oyununda. Lütfen bekle.',
          color: 0xef4444,
        }]
      });
    }

    const challengerData = await Economy.findOne({ userId: challenger.id }).catch(() => null);
    if (!challengerData) {
      return message.reply({
        embeds: [{
          title: '❌ Kayıt Bulunamadı',
          description: 'Önce kayıt olmalısın.',
          color: 0xef4444,
        }]
      });
    }
    const challengerBalance = challengerData.money ?? 0;

    let betAmount = 0;
    const raw = String(betArg).toLowerCase();
    if (ALL_KEYWORDS.includes(raw)) {
      if (challengerBalance < MIN_BET) {
        return message.reply({
          embeds: [{
            title: '❌ Yetersiz Bakiye (All Modu)',
            description:
              `Minimum bakiye: **${fmtMoney(MIN_BET)}** coin. Mevcut: **${fmtMoney(challengerBalance)}** coin.`,
            color: 0xef4444,
          }]
        });
      }
      betAmount = Math.min(challengerBalance, MAX_BET);
      console.log('[balik-tut] ALL modu → bahis:', betAmount);
    } else {
      const cleaned = String(raw).replace(/[^0-9]/g, '');
      const n = Number(cleaned);
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        return message.reply({
          embeds: [{
            title: '❌ Geçersiz Bahis',
            description: `Bahis miktarı pozitif TAM SAYI olmalı. Örn: \`.bt 500\``,
            color: 0xef4444,
          }]
        });
      }
      betAmount = Math.floor(n);
    }

    if (betAmount < MIN_BET) {
      return message.reply({
        embeds: [{
          title: '❌ Minimum Bahis',
          description: `Minimum bahis: **${fmtMoney(MIN_BET)}** coin.`,
          color: 0xef4444,
        }]
      });
    }
    if (betAmount > MAX_BET) {
      return message.reply({
        embeds: [{
          title: '❌ Maksimum Bahis',
          description: `Maksimum bahis: **${fmtMoney(MAX_BET)}** coin.`,
          color: 0xef4444,
        }]
      });
    }
    if (challengerBalance < betAmount) {
      return message.reply({
        embeds: [{
          title: '❌ Yetersiz Bakiye',
          description:
            `Gereken: **${fmtMoney(betAmount)}** coin.\nBakiyen: **${fmtMoney(challengerBalance)}** coin` +
            (ALL_KEYWORDS.includes(raw) ? '  (all/max modu)' : ''),
          color: 0xef4444,
        }]
      });
    }

    if (target) {
      return runTwoPlayer(client, message, manager, { challenger, target, betAmount });
    } else {
      return runSinglePlayer(client, message, manager, { challenger, betAmount });
    }
  },
};

async function runSinglePlayer(client, message, manager, { challenger, betAmount }) {
  ACTIVE_SESSIONS.add(challenger.id);
  console.log('[balik-tut] TEK KİŞİLİK başlıyor. Bahis:', betAmount);
  try {
    const dec = await Economy.findOneAndUpdate(
      { userId: challenger.id },
      { $inc: { money: -betAmount } },
      { new: true }
    ).catch(() => null);
    if (!dec || typeof dec.money !== 'number' || dec.money < 0) {
      try { await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: betAmount } }, {}); } catch {}
      ACTIVE_SESSIONS.delete(challenger.id);
      return message.reply({
        embeds: [{
          title: '❌ İşlem Başarısız',
          description: 'Bakiye düşerken bir sorun oluştu. Tekrar dene.',
          color: 0xef4444,
        }]
      });
    }

    const startMsg = await message.channel.send({
      embeds: [{
        title: '🎣 Oltayı Suya Bırakıyor...',
        description:
          `🎮 Oyuncu: <@${challenger.id}>\n` +
          `💰 Bahis: **${fmtMoney(betAmount)}** coin\n\n` +
          '`[ ❓ ] [ ❓ ] [ ❓ ]`',
        color: 0x1e3a8a,
      }]
    });

    const tier = pickWeightedTier();
    const fish = pickFish(tier);
    const weightKg = randomWeight();
    const mult = calcTotalMult(tier, weightKg);
    const winnings = Math.floor(betAmount * mult);
    const net = winnings - betAmount;

    if (startMsg && startMsg.editable) {
      await startMsg.edit({
        embeds: [{
          title: '🪝 Bir Şey Yakalandı!',
          description:
            `🎮 Oyuncu: <@${challenger.id}>\n` +
            `💰 Bahis: **${fmtMoney(betAmount)}** coin\n\n` +
            '`[ 🪝 ] [ ❓ ] [ ❓ ]`',
          color: 0x1e3a8a,
        }],
      }).catch(() => {});
    }

    await delay(450);
    if (startMsg && startMsg.editable) {
      await startMsg.edit({
        embeds: [{
          title: '⚡ Çekiyoruz! Tutun!',
          description:
            `🎮 Oyuncu: <@${challenger.id}>\n` +
            `💰 Bahis: **${fmtMoney(betAmount)}** coin\n\n` +
            '`[ 🪝 ] [ 💦 ] [ ❓ ]`',
          color: 0xeab308,
        }],
      }).catch(() => {});
    }

    await delay(450);
    if (startMsg && startMsg.editable) {
      await startMsg.edit({
        embeds: [{
          title: '⚖️ Ağırlığı Ölçülüyor...',
          description:
            `🎮 Oyuncu: <@${challenger.id}>\n` +
            `💰 Bahis: **${fmtMoney(betAmount)}** coin\n\n` +
            '`[ 🪝 ] [ 💦 ] [ 📊 ]`',
          color: 0xf97316,
        }],
      }).catch(() => {});
    }

    const xpGain = 3 + (tier === 'tier5' ? 20 : tier === 'tier4' ? 10 : tier === 'tier3' ? 5 : 1);
    if (winnings > 0) {
      await Economy.findOneAndUpdate(
        { userId: challenger.id },
        { $inc: { money: winnings, xp: xpGain } },
        {}
      ).catch(() => {});
    }

    const tierColor = TIER_COLORS[tier] === 'darkRed' ? 0x991b1b : 
                      TIER_COLORS[tier] === 'mintGreen' ? 0x10b981 :
                      TIER_COLORS[tier] === 'blue' ? 0x3b82f6 :
                      TIER_COLORS[tier] === 'purple' ? 0xa855f7 :
                      TIER_COLORS[tier] === 'gold' ? 0xfbbf24 : 0x3b82f6;
    const plusSign = net >= 0 ? '+' : '';
    const updatedEco = await Economy.findOne({ userId: challenger.id }).catch(() => null);

    let title;
    let resultDescription;
    if (tier === 'tier1') {
      title = '🗑️ Balık Yok! Çöp Çıkardın!';
      resultDescription =
        `😱 **HAYIR!** ${fish.emoji} **${fish.name}** çıkardın. Ne yazık ki çöp...\n\n` +
        `🎯 Yakalanan: ${fish.emoji} ${fish.name}\n` +
        `📦 Tier: ${TIER_NAMES[tier]}\n` +
        `⚖️ Ağırlık: **${fmtWeight(weightKg)}** kg\n\n` +
        `💰 Bahis: **${fmtMoney(betAmount)}** coin\n` +
        `✨ Çarpan: **x${mult.toFixed(2)}**\n` +
        `💸 NET: **${net.toLocaleString('tr-TR')}** coin`;
    } else {
      title = tier === 'tier5'
        ? '👑 JACKPOT!!! ALTIN BALIK!!!'
        : tier === 'tier4'
          ? '🌟 EFSANEVİ BALIK!'
          : tier === 'tier3'
            ? '🎉 NADİR BALIK YAKALANDI!'
            : '🎣 Güzel! Bir Balık Yakaladın!';
      resultDescription =
        `🎯 Yakalanan: **${fish.emoji} ${fish.name}**\n` +
        `📦 Tier: **${TIER_NAMES[tier]}**\n` +
        `⚖️ Ağırlık: **${fmtWeight(weightKg)}** kg\n\n` +
        `💰 Bahis: **${fmtMoney(betAmount)}** coin\n` +
        `✨ Çarpan: **x${mult.toFixed(2)}** (Tier × Ağırlık bonusu)\n` +
        `💸 Toplam Geri Ödeme: **${fmtMoney(winnings)}** coin\n` +
        `💸 NET: **${plusSign}${fmtMoney(net)}** coin\n` +
        `✨ XP: **+${xpGain}**`;
    }

    if (startMsg && startMsg.editable) {
      await startMsg.edit({
        embeds: [{
          title,
          description: resultDescription,
          color: tierColor,
          fields: [{
            name: '💼 Yeni Bakiye',
            value: `**${fmtMoney((updatedEco?.money ?? 0))}** coin`,
            inline: false,
          }],
        }],
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[balik-tut] TEK OYUNCU HATA:', err);
    try {
      await message.channel.send({
        embeds: [{
          title: '❌ Oyun Hatası',
          description: `Hata:\n\`${String(err?.message || err).slice(0, 300)}\``,
          color: 0xef4444,
        }]
      });
    } catch {}
  } finally {
    ACTIVE_SESSIONS.delete(challenger.id);
  }
}

async function runTwoPlayer(client, message, manager, { challenger, target, betAmount }) {
  const targetData = await Economy.findOne({ userId: target.id }).catch(() => null);
  const targetBalance = targetData?.money ?? 0;
  if (targetBalance < betAmount) {
    return message.reply({
      embeds: [{
        title: '❌ Rakibin Yeterli Parası Yok',
        description:
          `<@${target.id}> için bakiyesi **${fmtMoney(betAmount)}** coin olmalı.\n` +
          `Mevcut: **${fmtMoney(targetBalance)}** coin`,
        color: 0xef4444,
      }]
    });
  }

  const buttonBuilder = new Button();
  buttonBuilder.add('bt_accept', '✅ Kabul Et', buttonBuilder.style.Success);
  buttonBuilder.add('bt_reject', '❌ Reddet', buttonBuilder.style.Danger);
  const componentsRow = buttonBuilder.build();

  const offerMsg = await message.channel.send({
    embeds: [{
      title: '🎣 Balık Tutma Yarışı Teklifi!',
      description:
        `<@${challenger.id}>, <@${target.id}> rakibine **${fmtMoney(betAmount)}** coinlik yarış teklif etti!\n\n` +
        `🎁 Havuz: **${fmtMoney(betAmount * 2)}** coin (kazanan hepsini alır)\n` +
        `⏳ Onay için **30 saniyen** var.`,
      color: 0x1e3a8a,
    }],
    components: [componentsRow],
  });

  const cleanupOfferLock = () => {
    ACTIVE_SESSIONS.delete(challenger.id);
    ACTIVE_SESSIONS.delete(target.id);
  };

  ACTIVE_SESSIONS.add(challenger.id);
  ACTIVE_SESSIONS.add(target.id);

  let resolved = false;
  const offerCollector = offerMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === target.id && ['bt_accept', 'bt_reject'].includes(i.customId),
    max: 1,
    time: 30000,
  });

  offerCollector.on('collect', async (interaction) => {
    try { await interaction.deferUpdate(); } catch {}

    if (interaction.customId === 'bt_reject') {
      resolved = true;
      cleanupOfferLock();
      if (offerMsg && offerMsg.editable) {
        await offerMsg.edit({
          embeds: [{
            title: '❌ Teklif Reddedildi',
            description: `<@${target.id}> yarış teklifini reddetti.`,
            color: 0xef4444,
          }],
          components: [],
        }).catch(() => {});
      }
      return;
    }

    resolved = true;
    const dec1 = await Economy.findOneAndUpdate(
      { userId: challenger.id },
      { $inc: { money: -betAmount } },
      { new: true }
    ).catch(() => null);
    const dec2 = await Economy.findOneAndUpdate(
      { userId: target.id },
      { $inc: { money: -betAmount } },
      { new: true }
    ).catch(() => null);

    if (!dec1 || !dec2 || (dec1.money ?? -1) < 0 || (dec2.money ?? -1) < 0) {
      if (dec1 && (dec1.money ?? -1) >= 0) {
        try { await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: betAmount } }, {}); } catch {}
      }
      if (dec2 && (dec2.money ?? -1) >= 0) {
        try { await Economy.findOneAndUpdate({ userId: target.id }, { $inc: { money: betAmount } }, {}); } catch {}
      }
      cleanupOfferLock();
      if (offerMsg && offerMsg.editable) {
        await offerMsg.edit({
          embeds: [{
            title: '❌ İşlem Başarısız',
            description: 'Bakiye çekiminde sorun oluştu. Tekrar deneyin.',
            color: 0xef4444,
          }],
          components: [],
        }).catch(() => {});
      }
      return;
    }

    const pool = betAmount * 2;
    if (offerMsg && offerMsg.editable) {
      await offerMsg.edit({
        embeds: [{
          title: '🎣 2 KİŞİLİK BALIK YARIŞI BAŞLIYOR!',
          description:
            `🟦 <@${challenger.id}>  vs  🟥 <@${target.id}>\n\n` +
            `💰 Havuz: **${fmtMoney(pool)}** coin\n` +
            `⏱️ Oltayı hazırlamak...`,
          color: 0x1e3a8a,
        }],
        components: [],
      }).catch(() => {});
    }

    const p1Tier = pickWeightedTier();
    const p1Fish = pickFish(p1Tier);
    const p1Weight = randomWeight();
    const p1Score = scoreFish(p1Tier, p1Weight);

    const p2Tier = pickWeightedTier();
    const p2Fish = pickFish(p2Tier);
    const p2Weight = randomWeight();
    const p2Score = scoreFish(p2Tier, p2Weight);

    const fmtRow = (label, fish, w, score, revealed) => {
      if (!revealed) return `${label} \`[ ❓ ] [ ❓ ] [ ❓ ]\``;
      return `${label} ${fish.emoji} **${fish.name}** | **${fmtWeight(w)} kg** | Puan: **${score.toFixed(2)}**`;
    };

    await delay(500);
    if (offerMsg && offerMsg.editable) {
      await offerMsg.edit({
        embeds: [{
          title: '🪝 Herkes Oltayı Attı!',
          description:
            fmtRow('🟦 1.', p1Fish, p1Weight, p1Score, false) + '\n' +
            fmtRow('🟥 2.', p2Fish, p2Weight, p2Score, false) +
            `\n\n💰 Havuz: **${fmtMoney(pool)}** coin`,
          color: 0x1e3a8a,
        }],
      }).catch(() => {});
    }

    await delay(600);
    if (offerMsg && offerMsg.editable) {
      await offerMsg.edit({
        embeds: [{
          title: '⚡ Oyuncu 1 (🟦) Balığı Çekiliyor!',
          description:
            fmtRow('🟦', p1Fish, p1Weight, p1Score, true) + '\n' +
            fmtRow('🟥', p2Fish, p2Weight, p2Score, false) +
            `\n\n💰 Havuz: **${fmtMoney(pool)}** coin`,
          color: 0x3b82f6,
        }],
      }).catch(() => {});
    }

    await delay(1100);
    if (offerMsg && offerMsg.editable) {
      await offerMsg.edit({
        embeds: [{
          title: '🎆 SONUÇLAR AÇIKLANIYOR!',
          description:
            fmtRow('🟦', p1Fish, p1Weight, p1Score, true) + '\n' +
            fmtRow('🟥', p2Fish, p2Weight, p2Score, true) +
            `\n\n💰 Havuz: **${fmtMoney(pool)}** coin`,
          color: 0xfbbf24,
        }],
      }).catch(() => {});
    }

    let winner = null;
    let tie = false;
    const diff = Math.abs(p1Score - p2Score);
    if (diff < 0.05) {
      tie = true;
    } else if (p1Score > p2Score) {
      winner = challenger;
    } else {
      winner = target;
    }

    if (tie) {
      try { await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: betAmount } }, {}); } catch {}
      try { await Economy.findOneAndUpdate({ userId: target.id }, { $inc: { money: betAmount } }, {}); } catch {}
    } else if (winner) {
      try { await Economy.findOneAndUpdate({ userId: winner.id }, { $inc: { money: pool, xp: 25 } }, {}); } catch {}
    }

    const wEco = winner ? await Economy.findOne({ userId: winner.id }).catch(() => null) : null;

    let title;
    let color;
    let desc;
    if (tie) {
      title = '🤝 BERABERLİK!';
      color = 0xeab308;
      desc =
        'İki oyuncu da neredeyse aynı puan aldı! İki tarafa da kendi bahisleri iade edildi.\n\n' +
        fmtRow('🟦', p1Fish, p1Weight, p1Score, true) + '\n' +
        fmtRow('🟥', p2Fish, p2Weight, p2Score, true) +
        `\n\n📊 Puan Farkı: **${diff.toFixed(3)}** (çok yakın!)`;
    } else {
      title = `🏆 KAZANAN: @${winner.username}!`;
      const winTier = winner.id === challenger.id ? p1Tier : p2Tier;
      color = winTier === 'tier5' ? 0xfbbf24 : 
              winTier === 'tier4' ? 0xa855f7 :
              winTier === 'tier3' ? 0x3b82f6 : 0x10b981;
      desc =
        `🎉 <@${winner.id}> balık tutma yarışını kazandı!\n` +
        `**${fmtMoney(pool)}** coin kazananın hesabına yatırıldı! +25 XP\n\n` +
        fmtRow(`🟦 <@${challenger.id}>`, p1Fish, p1Weight, p1Score, true) + '\n' +
        fmtRow(`🟥 <@${target.id}>`, p2Fish, p2Weight, p2Score, true) +
        `\n\n📊 Fark: **${diff.toFixed(2)}** puan`;
      if (wEco) desc += `\n💼 Kazanan Yeni Bakiye: **${fmtMoney(wEco.money ?? 0)}** coin`;
    }

    if (offerMsg && offerMsg.editable) {
      await offerMsg.edit({ embeds: [{ title, description: desc, color }] }).catch(() => {});
    }

    cleanupOfferLock();
  });

  offerCollector.on('end', (_, reason) => {
    if (resolved) return;
    cleanupOfferLock();
    if (offerMsg && offerMsg.editable && reason === 'time') {
      offerMsg.edit({
        embeds: [{
          title: '⏳ Teklif Süresi Doldu',
          description: `<@${target.id}> 30 saniye içinde onay vermedi. Teklif iptal edildi.`,
          color: 0xf97316,
        }],
        components: [],
      }).catch(() => {});
    } else if (offerMsg && offerMsg.editable) {
      offerMsg.edit({ components: [] }).catch(() => {});
    }
  });
}
