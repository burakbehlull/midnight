import Manager from '#managers';
import { Economy } from '#models';
import { Button, gameStatsHelper } from '#helpers';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const MIN_BET = 50;
const MAX_BET = 50000;

const COLS = 5;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const HOUSE_EDGE = 0.03;
const DEFAULT_MINES = 3;
const MAX_MINES = TOTAL - 1;
const ALL_KEYWORDS = ['all', 'max', 'tüm', 'hepsi'];

const activeGames = new Set();


function multiplierFor(picks, mines) {
  if (picks <= 0) return 0;
  let prob = 1;
  for (let i = 0; i < picks; i++) {
    prob *= (TOTAL - mines - i) / (TOTAL - i);
  }
  if (prob <= 0) return 0;
  return Math.round(((1 - HOUSE_EDGE) / prob) * 100) / 100;
}

function fmt(n) {
  return Math.floor(n).toLocaleString('tr-TR');
}

export default {
  name: 'mines',
  category: 'games',
  aliases: ['mayin', 'mayıntarlası', 'mayintarlasi', 'mayın', 'mt'],
  usage: '.mines <bahis|all> [mayın]  |  .mines @kişi <bahis> [mayın]',
  description: 'Mayın tarlası oyna! Kareleri aç, çarpanı büyüt, mayına basmadan çekil. Birini etiketlersen bahisli 2 kişilik düello başlar.',
  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const challenger = message.author;


    let target = null;
    let betArg = args[0];
    let minesArg = args[1];

    const mentionFromMsg = message.mentions?.users?.first() || null;
    if (mentionFromMsg) {
      target = mentionFromMsg;
      betArg = args[1];
      minesArg = args[2];
    } else if (args[0] && /^<@!?(\d+)>$/.test(args[0])) {
      const uid = args[0].match(/^<@!?(\d+)>$/)?.[1];
      if (uid) {
        target = await client.users.fetch(uid).catch(() => null) || client.users.cache.get(uid) || null;
        betArg = args[1];
        minesArg = args[2];
      }
    }

    if (target) {
      if (target.bot) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Botlarla oyun oynanmaz.'));
      }
      if (target.id === challenger.id) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Kendinle oyun oynayamazsın.'));
      }
    }

    if (activeGames.has(challenger.id)) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Zaten aktif bir oyunun var. Önce onu bitir!'));
    }
    if (target && activeGames.has(target.id)) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ <@${target.id}> şu an başka bir oyunda. Lütfen bekle.`));
    }

    if (!betArg) {
      return manager.sender.reply(manager.sender.errorEmbed(
        '**Tek Kişilik:** `.mines 500` veya `.mines all`\n' +
        '**2 Kişilik:** `.mines @Kullanıcı 1000`'
      ));
    }


    const rawBet = String(betArg).toLowerCase().trim();
    const isAll = ALL_KEYWORDS.includes(rawBet);

    let userData = await Economy.findOne({ userId: challenger.id });
    if (!userData) {
      userData = new Economy({ userId: challenger.id });
      await userData.save().catch(() => {});
    }

    let amount;
    if (isAll) {
      const balance = userData.money ?? 0;
      if (balance < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(
          `❌ All modu için bakiyen minimum **${fmt(MIN_BET)}** coin olmalı. Mevcut: **${fmt(balance)}** coin`
        ));
      }
      amount = Math.min(balance, MAX_BET);
    } else {
      amount = parseInt(betArg);
      if (isNaN(amount) || amount <= 0) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir bahis miktarı belirt. Kullanım: `.mines 500` veya `.mines all`'));
      }
      if (amount < MIN_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Minimum bahis miktarı **${fmt(MIN_BET)}** coin.`));
      }
      if (amount > MAX_BET) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Maksimum bahis miktarı **${fmt(MAX_BET)}** coin.`));
      }
    }


    let mines = DEFAULT_MINES;
    if (minesArg !== undefined) {
      const m = parseInt(minesArg);
      if (isNaN(m) || m < 1 || m > MAX_MINES) {
        return manager.sender.reply(manager.sender.errorEmbed(`❌ Mayın sayısı **1** ile **${MAX_MINES}** arasında olmalı.`));
      }
      mines = m;
    }

    if ((userData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Yeterli coin yok. Gereken: **${fmt(amount)}** coin.`));
    }

    if (target) {
      return runTwoPlayer(client, message, manager, { challenger, target, amount, mines });
    }
    return runSinglePlayer(client, message, manager, { userId: challenger.id, amount, mines });
  },
};

/* ============================ TEK KİŞİLİK ============================ */

async function runSinglePlayer(client, message, manager, { userId, amount, mines }) {
  try {
    await Economy.findOneAndUpdate(
      { userId },
      { $inc: { money: -amount } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (e) {
    return manager.sender.reply(manager.sender.errorEmbed('❌ Bahis çekimi sırasında hata oluştu.'));
  }

  activeGames.add(userId);

  const refund = async () => {
    try { await Economy.findOneAndUpdate({ userId }, { $inc: { money: amount } }); } catch (_) {}
  };

  const mineSet = new Set();
  while (mineSet.size < mines) mineSet.add(Math.floor(Math.random() * TOTAL));

  const revealed = new Set();
  let picks = 0;
  let gameOver = false;
  let hitIndex = -1;
  let resultText = '';
  const nonce = Date.now();
  const safeTotal = TOTAL - mines;

  const buildComponents = () => {
    const rows = [];
    let row = new ActionRowBuilder();

    for (let i = 0; i < TOTAL; i++) {
      const isMine = mineSet.has(i);
      const isOpen = revealed.has(i);

      let label = '❓';
      let style = ButtonStyle.Secondary;
      let disabled = gameOver;

      if (gameOver && i === hitIndex) {
        label = '💥';
        style = ButtonStyle.Primary;
        disabled = true;
      } else if (isOpen) {
        label = '💎';
        style = ButtonStyle.Success;
        disabled = true;
      } else if (gameOver && isMine) {
        label = '💥';
        style = ButtonStyle.Danger;
        disabled = true;
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`mines_${nonce}_t${i}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled)
      );

      if (row.components.length === COLS) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
    }
    if (row.components.length) rows.push(row);

    if (!gameOver) {
      const potential = Math.floor(amount * multiplierFor(picks, mines));
      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`mines_${nonce}_cash`)
            .setLabel(picks > 0 ? `Çekil (+${fmt(potential)} coin)` : 'Çekil')
            .setStyle(picks > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(picks === 0)
        )
      );
    }

    return rows;
  };

  const buildEmbed = (override = {}) => {
    const mult = multiplierFor(picks, mines);
    const potential = Math.floor(amount * mult);

    const desc =
      `**Bahis:** ${fmt(amount)} coin • **Mayın:** ${mines}\n` +
      `**Açılan:** ${picks}/${safeTotal} • **Çarpan:** ${mult}x\n` +
      `**Çekilecek:** ${fmt(potential)} coin\n\n` +
      (resultText || 'Bir kare aç ya da **Çekil** ile kazancını al.');

    return manager.sender.embed({
      color: override.color ?? manager.sender.colors.blue,
      title: override.title ?? '💣 MAYIN TARLASI',
      description: desc,
      footer: { text: `Bahis: ${fmt(amount)} coin` }
    });
  };

  let replyMsg;
  try {
    replyMsg = await message.channel.send({
      embeds: [buildEmbed()],
      components: buildComponents()
    });
  } catch (e) {
    console.error('[mines] Mesaj gönderilemedi:', e?.message || e);
    activeGames.delete(userId);
    await refund();
    try {
      await manager.sender.reply(manager.sender.errorEmbed('❌ Oyun mesajı gönderilemedi. Botun mesaj gönderme iznini kontrol et.'));
    } catch (_) {}
    return;
  }

  const edit = async () => {
    try { await replyMsg.edit({ embeds: [buildEmbed()], components: buildComponents() }); } catch (_) {}
  };

  const collector = replyMsg.createMessageComponentCollector({ time: 120_000 });

  const cashOut = async (auto = false) => {
    if (gameOver) return;
    gameOver = true;

    const mult = multiplierFor(picks, mines);
    const payout = Math.floor(amount * mult);
    try {
      await Economy.findOneAndUpdate(
        { userId },
        { $inc: { money: payout, xp: Math.max(3, picks) } },
        { new: true }
      );
    } catch (e) {
      console.error('[mines] Ödeme hatası:', e);
    }

    gameStatsHelper.recordGame(message.guild.id, userId, 'mines', {
      play: 1,
      win: payout > amount ? 1 : 0,
      loss: payout < amount ? 1 : 0,
      draw: payout === amount ? 1 : 0,
      won: payout > amount ? payout - amount : 0,
      lost: payout < amount ? amount - payout : 0,
    });

    resultText = `🎉 **${mult}x** ile çekildin! Kazanç: **+${fmt(payout)} coin**` +
      (auto ? ' _(süre doldu, otomatik çekildi)_' : '');
    try {
      await replyMsg.edit({
        embeds: [buildEmbed({ color: manager.sender.colors.green, title: '🎉 ÇEKİLDİN!' })],
        components: buildComponents()
      });
    } catch (_) {}
    activeGames.delete(userId);
    try { collector.stop('cashout'); } catch (_) {}
  };

  const loseGame = async (idx) => {
    if (gameOver) return;
    gameOver = true;
    hitIndex = idx;
    revealed.add(idx);

    resultText = `💥 Mayına bastın! Kaybettin: **-${fmt(amount)} coin**`;
    gameStatsHelper.recordGame(message.guild.id, userId, 'mines', { play: 1, loss: 1, lost: amount });
    try {
      await replyMsg.edit({
        embeds: [buildEmbed({ color: manager.sender.colors.liveRed, title: '💥 MAYINA BASTIN!' })],
        components: buildComponents()
      });
    } catch (_) {}
    activeGames.delete(userId);
    try { collector.stop('lose'); } catch (_) {}
  };

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ Bu Mayın Tarlası oyunu senin değil!', ephemeral: true }).catch(() => {});
    }
    try { await interaction.deferUpdate(); } catch (_) {}
    if (gameOver) return;

    const id = interaction.customId;

    if (id === `mines_${nonce}_cash`) {
      return cashOut(false);
    }

    const match = id.match(new RegExp(`^mines_${nonce}_t(\\d+)$`));
    if (!match) return;

    const idx = parseInt(match[1]);
    if (revealed.has(idx)) return;

    if (mineSet.has(idx)) {
      return loseGame(idx);
    }

    revealed.add(idx);
    picks++;

    if (picks >= safeTotal) {
      return cashOut(false);
    }

    await edit();
  });

  collector.on('end', async (_, reason) => {
    if (gameOver || reason === 'cashout' || reason === 'lose') return;

    if (picks > 0) {
      return cashOut(true);
    }

    gameOver = true;
    resultText = `⏰ Süre doldu! Kaybettin: **-${fmt(amount)} coin**`;
    activeGames.delete(userId);
    try {
      await replyMsg.edit({
        embeds: [buildEmbed({ color: manager.sender.colors.liveRed, title: '⏰ SÜRE DOLDU' })],
        components: []
      });
    } catch (_) {}
  });
}

/* ============================ 2 KİŞİLİK ============================ */

async function runTwoPlayer(client, message, manager, { challenger, target, amount, mines }) {
  const targetData = await Economy.findOne({ userId: target.id }).catch(() => null);
  const targetBalance = targetData?.money ?? 0;
  if (targetBalance < amount) {
    return manager.sender.reply(manager.sender.errorEmbed(
      `❌ <@${target.id}> yeterli coin'e sahip değil.\nGereken: **${fmt(amount)}** coin • Mevcut: **${fmt(targetBalance)}** coin`
    ));
  }

  const offerNonce = Date.now();
  const acceptId = `mt_${offerNonce}_accept`;
  const rejectId = `mt_${offerNonce}_reject`;

  const buttonBuilder = new Button();
  buttonBuilder.add(acceptId, '✅ Kabul Et', buttonBuilder.style.Success);
  buttonBuilder.add(rejectId, '❌ Reddet', buttonBuilder.style.Danger);

  let offerMsg;
  try {
    offerMsg = await message.channel.send({
      embeds: [manager.sender.embed({
        color: manager.sender.colors.blue,
        title: '💣 2 KİŞİLİK MAYIN TARLASI TEKLİFİ',
        description:
          `<@${challenger.id}>, <@${target.id}> rakibine **${fmt(amount)}** coinlik mayın tarlası düellosu teklif etti!\n\n` +
          `🎁 Havuz: **${fmt(amount * 2)}** coin (kazanan hepsini alır)\n` +
          `💣 Mayın: **${mines}** • Kare: **${TOTAL}**\n` +
          `⏳ Onay için **30 saniyen** var.`,
        footer: { text: 'Sırayla kare aç, mayına basan kaybeder!' }
      })],
      components: [buttonBuilder.build()]
    });
  } catch (e) {
    console.error('[mines-2p] Teklif mesajı gönderilemedi:', e?.message || e);
    return;
  }

  activeGames.add(challenger.id);
  activeGames.add(target.id);

  const cleanup = () => {
    activeGames.delete(challenger.id);
    activeGames.delete(target.id);
  };

  let resolved = false;
  const offerCollector = offerMsg.createMessageComponentCollector({
    time: 30000
  });

  offerCollector.on('collect', async (interaction) => {

    if (interaction.user.id !== target.id) {
      return interaction.reply({
        content: '❌ Bu teklifi sadece etiketlenen kişi yanıtlayabilir.',
        ephemeral: true
      }).catch(() => {});
    }

    try { await interaction.deferUpdate(); } catch (_) {}
    if (resolved) return;
    resolved = true;
    try { offerCollector.stop('answered'); } catch (_) {}

    if (interaction.customId === rejectId) {
      cleanup();
      await offerMsg.edit({
        embeds: [manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '❌ Teklif Reddedildi',
          description: `<@${target.id}> mayın tarlası teklifini reddetti.`,
          footer: { text: ' ' }
        })],
        components: []
      }).catch(() => {});
      return;
    }

    if (interaction.customId !== acceptId) return;


    const dec1 = await Economy.findOneAndUpdate(
      { userId: challenger.id },
      { $inc: { money: -amount } },
      { new: true }
    ).catch(() => null);
    const dec2 = await Economy.findOneAndUpdate(
      { userId: target.id },
      { $inc: { money: -amount } },
      { new: true }
    ).catch(() => null);

    if (!dec1 || !dec2 || (dec1.money ?? -1) < 0 || (dec2.money ?? -1) < 0) {
      if (dec1 && (dec1.money ?? -1) >= 0) {
        try { await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: amount } }, {}); } catch (_) {}
      }
      if (dec2 && (dec2.money ?? -1) >= 0) {
        try { await Economy.findOneAndUpdate({ userId: target.id }, { $inc: { money: amount } }, {}); } catch (_) {}
      }
      cleanup();
      await offerMsg.edit({
        embeds: [manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '❌ İşlem Başarısız',
          description: 'Bakiye çekiminde sorun oluştu. Tekrar deneyin.',
          footer: { text: ' ' }
        })],
        components: []
      }).catch(() => {});
      return;
    }

    await startDuel({ client, manager, offerMsg, challenger, target, amount, mines, cleanup });
  });

  offerCollector.on('end', async (_, reason) => {
    if (resolved) return;
    cleanup();
    if (reason === 'time') {
      await offerMsg.edit({
        embeds: [manager.sender.embed({
          color: manager.sender.colors.orange,
          title: '⏳ Teklif Süresi Doldu',
          description: `<@${target.id}> 30 saniye içinde onay vermedi. Teklif iptal edildi.`,
          footer: { text: ' ' }
        })],
        components: []
      }).catch(() => {});
    }
  });
}

async function startDuel({ manager, offerMsg, challenger, target, amount, mines, cleanup }) {
  const pool = amount * 2;
  const safeTotal = TOTAL - mines;

  const mineSet = new Set();
  while (mineSet.size < mines) mineSet.add(Math.floor(Math.random() * TOTAL));

  const revealed = new Set();
  const scores = { [challenger.id]: 0, [target.id]: 0 };
  let turn = challenger.id;
  let gameOver = false;
  let hitIndex = -1;
  const nonce = Date.now();
  const tilePrefix = `mtd_${nonce}_t`;

  const buildComponents = () => {
    const rows = [];
    let row = new ActionRowBuilder();

    for (let i = 0; i < TOTAL; i++) {
      const isMine = mineSet.has(i);
      const isOpen = revealed.has(i);

      let label = '❓';
      let style = ButtonStyle.Secondary;
      let disabled = gameOver;

      if (gameOver && i === hitIndex) {
        label = '💥';
        style = ButtonStyle.Primary;
        disabled = true;
      } else if (isOpen) {
        label = '💎';
        style = ButtonStyle.Success;
        disabled = true;
      } else if (gameOver && isMine) {
        label = '💥';
        style = ButtonStyle.Danger;
        disabled = true;
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${tilePrefix}${i}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled)
      );

      if (row.components.length === COLS) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
    }
    if (row.components.length) rows.push(row);

    return rows;
  };

  const buildEmbed = (override = {}) => manager.sender.embed({
    color: override.color ?? manager.sender.colors.blue,
    title: override.title ?? '💣 2 KİŞİLİK MAYIN TARLASI',
    description:
      `🟦 <@${challenger.id}>: **${scores[challenger.id]}** puan\n` +
      `🟥 <@${target.id}>: **${scores[target.id]}** puan\n\n` +
      `💰 Havuz: **${fmt(pool)}** coin\n` +
      `💣 Mayın: **${mines}** • Açılan kare: **${revealed.size}/${safeTotal}**\n\n` +
      (override.text ?? `🎯 Sıra: <@${turn}>\nMayına basan kaybeder, tüm havuzu rakibi alır!`),
    footer: { text: `Kişi başı bahis: ${fmt(amount)} coin` }
  });

  const collector = offerMsg.createMessageComponentCollector({
    time: 120_000
  });


  await offerMsg.edit({ embeds: [buildEmbed()], components: buildComponents() }).catch(() => {});

  const winnerPayout = async (winnerId) => {
    try {
      await Economy.findOneAndUpdate({ userId: winnerId }, { $inc: { money: pool, xp: 25 } }, {});
    } catch (_) {}
    return Economy.findOne({ userId: winnerId }).catch(() => null);
  };

  const endByMine = async (loserId) => {
    if (gameOver) return;
    gameOver = true;

    const winnerId = loserId === challenger.id ? target.id : challenger.id;
    const wEco = await winnerPayout(winnerId);

    gameStatsHelper.recordGame(offerMsg.guild?.id, winnerId, 'mines', { play: 1, win: 1, won: pool - amount });
    gameStatsHelper.recordGame(offerMsg.guild?.id, loserId, 'mines', { play: 1, loss: 1, lost: amount });

    await offerMsg.edit({
      embeds: [buildEmbed({
        color: manager.sender.colors.liveRed,
        title: '💥 MAYINA BASTIN!',
        text:
          `💥 <@${loserId}> mayına bastı ve **${fmt(amount)}** coin kaybetti!\n\n` +
          `🏆 Kazanan: <@${winnerId}>\n` +
          `💰 Kazanç: **+${fmt(pool - amount)}** coin (havuz ${fmt(pool)} coin)\n` +
          (wEco ? `💼 Yeni Bakiye: **${fmt(wEco.money ?? 0)}** coin` : '')
      })],
      components: buildComponents()
    }).catch(() => {});

    cleanup();
    try { collector.stop('duel'); } catch (_) {}
  };

  const endByPoints = async () => {
    if (gameOver) return;
    gameOver = true;

    const s1 = scores[challenger.id];
    const s2 = scores[target.id];

    if (s1 === s2) {
      try { await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: amount } }, {}); } catch (_) {}
      try { await Economy.findOneAndUpdate({ userId: target.id }, { $inc: { money: amount } }, {}); } catch (_) {}

      gameStatsHelper.recordGame(offerMsg.guild?.id, challenger.id, 'mines', { play: 1, draw: 1 });
      gameStatsHelper.recordGame(offerMsg.guild?.id, target.id, 'mines', { play: 1, draw: 1 });

      await offerMsg.edit({
        embeds: [buildEmbed({
          color: manager.sender.colors.gold,
          title: '🤝 BERABERLİK!',
          text:
            `Tüm güvenli kareler açıldı ve puanlar eşit (**${s1} - ${s2}**).\n` +
            `İki oyuncuya da bahisleri iade edildi.`
        })],
        components: buildComponents()
      }).catch(() => {});
    } else {
      const winnerId = s1 > s2 ? challenger.id : target.id;
      const wEco = await winnerPayout(winnerId);

      gameStatsHelper.recordGame(offerMsg.guild?.id, winnerId, 'mines', { play: 1, win: 1, won: pool - amount });
      gameStatsHelper.recordGame(offerMsg.guild?.id, winnerId === challenger.id ? target.id : challenger.id, 'mines', { play: 1, loss: 1, lost: amount });

      await offerMsg.edit({
        embeds: [buildEmbed({
          color: manager.sender.colors.green,
          title: '🏆 DÜELLO BİTTİ!',
          text:
            `Tüm güvenli kareler açıldı. Kazanan: <@${winnerId}>\n\n` +
            `<@${challenger.id}>: **${s1}** puan\n` +
            `<@${target.id}>: **${s2}** puan\n\n` +
            `Kazanç: **+${fmt(pool - amount)}** coin (havuz ${fmt(pool)} coin)\n` +
            (wEco ? `💼 Yeni Bakiye: **${fmt(wEco.money ?? 0)}** coin` : '')
        })],
        components: buildComponents()
      }).catch(() => {});
    }

    cleanup();
    try { collector.stop('duel'); } catch (_) {}
  };

  collector.on('collect', async (interaction) => {

    if (interaction.user.id !== challenger.id && interaction.user.id !== target.id) {
      return interaction.reply({ content: '❌ Bu oyun sana ait değil.', ephemeral: true }).catch(() => {});
    }
    if (!interaction.customId.startsWith(tilePrefix)) {
      return interaction.deferUpdate().catch(() => {});
    }

    try { await interaction.deferUpdate(); } catch (_) {}
    if (gameOver) return;

    if (interaction.user.id !== turn) {
      return interaction.followUp({ content: '❌ Sıra sende değil!', ephemeral: true }).catch(() => {});
    }

    const idx = parseInt(interaction.customId.slice(tilePrefix.length));
    if (isNaN(idx) || revealed.has(idx)) return;

    if (mineSet.has(idx)) {
      revealed.add(idx);
      hitIndex = idx;
      return endByMine(interaction.user.id);
    }

    revealed.add(idx);
    scores[interaction.user.id]++;
    turn = interaction.user.id === challenger.id ? target.id : challenger.id;

    if (revealed.size >= safeTotal) {
      return endByPoints();
    }

    await offerMsg.edit({ embeds: [buildEmbed()], components: buildComponents() }).catch(() => {});
  });

  collector.on('end', async (_, reason) => {
    if (gameOver) return;
    if (reason === 'duel') return;

    gameOver = true;
    const loserId = turn;
    const winnerId = loserId === challenger.id ? target.id : challenger.id;
    const wEco = await winnerPayout(winnerId);

    gameStatsHelper.recordGame(offerMsg.guild?.id, winnerId, 'mines', { play: 1, win: 1, won: pool - amount });
    gameStatsHelper.recordGame(offerMsg.guild?.id, loserId, 'mines', { play: 1, loss: 1, lost: amount });

    await offerMsg.edit({
      embeds: [buildEmbed({
        color: manager.sender.colors.orange,
        title: '⏰ SÜRE DOLDU',
        text:
          `⏰ <@${loserId}> zamanında oynamadı ve hükmen kaybetti!\n\n` +
          `🏆 Kazanan: <@${winnerId}>\n` +
          `💰 Kazanç: **+${fmt(pool - amount)}** coin\n` +
          (wEco ? `💼 Yeni Bakiye: **${fmt(wEco.money ?? 0)}** coin` : '')
      })],
      components: buildComponents()
    }).catch(() => {});

    cleanup();
  });
}
