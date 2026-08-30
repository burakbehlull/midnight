import Manager from '#managers';
import { Economy } from '#models';
import { Button, misc } from '#helpers';

const activeGames = new Set();

export default {
  name: 'rusruleti',
  category: 'fun',
  aliases: ['rr', 'rusruleti', 'rulet'],
  usage: '.rusruleti @kullanıcı <miktar>',
  description: 'Rakibine karşı Rus ruleti oynayın, kazanan tüm parayı alır.',
  permissions: {
    enabled: false
  },
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
      return manager.sender.reply(manager.sender.errorEmbed('❌ Kendinle Rus ruleti oynayamazsın.'));
    }

    if (targetUser.bot) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Botlarla Rus ruleti oynayamazsın.'));
    }

    const minBet = Math.ceil(amount * 0.10);
    if (amount < minBet) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ En az **${minBet}** coin değerinde bahis girmelisin (%10 kuralı).`));
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
      return manager.sender.reply(manager.sender.errorEmbed(`❌ Hesabında yeterli coin yok. Gereken: **${amount}** coin.`));
    }

    if ((targetData.money ?? 0) < amount) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ ${targetUser.username} hesabında yeterli coin yok. Gereken: **${amount}** coin.`));
    }

    const pot = amount * 2;
    activeGames.add(challenger.id);
    activeGames.add(targetUser.id);

    const confirmBtns = new Button();
    confirmBtns.add('rr_accept', 'Kabul Et', confirmBtns.style.Success);
    confirmBtns.add('rr_reject', 'Reddet',  confirmBtns.style.Danger);
    const confirmRow = confirmBtns.build();

    const confirmEmbed = manager.sender.embed({
      color: manager.sender.colors.gold,
      title: '🎯 RUS ROULETTE - Teklif',
      description: `Hey <@${targetUser.id}>!\n\n**<@${challenger.id}>** sana **${amount} coin** değerinde Rus ruleti teklif etti!\n\n🔫 6 namlu, 1 kurşun\n💰 Toplam havuz: **${pot} coin**\n\nKabul ediyor musun? 30 saniyen var!`,
      footer: { text: 'Butonları sadece teklif alan kişi kullanabilir.' }
    });

    const confirmMsg = await message.channel.send({
      content: `<@${targetUser.id}>`,
      embeds: [confirmEmbed],
      components: [confirmRow],
      allowedMentions: { users: [targetUser.id] }
    }).catch(() => null);

    if (!confirmMsg) {
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }

    const confirmCollector = confirmMsg.createMessageComponentCollector({
      time: 30_000,
    });

    let confirmed = false;
    let challengerConfirm = challenger;
    let targetConfirm = targetUser;

    confirmCollector.on('collect', async (interaction) => {
      if (interaction.user.id !== targetConfirm.id) {
        return interaction.reply({ content: '❌ Bu butonları sadece teklif alan kişi kullanabilir.', ephemeral: true });
      }

      try { await interaction.deferUpdate(); } catch (_) {}

      if (interaction.customId === 'rr_reject') {
        confirmed = false;
        confirmCollector.stop('answered');
        activeGames.delete(challengerConfirm.id);
        activeGames.delete(targetConfirm.id);
        const rejectEmbed = manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '❌ Teklif Reddedildi',
          description: `<@${targetConfirm.id}> teklifi reddetti.`
        });
        return confirmMsg.edit({ content: '', embeds: [rejectEmbed], components: [] }).catch(() => {});
      }

      if (interaction.customId === 'rr_accept') {
        confirmed = true;
        confirmCollector.stop('answered');
        await startGame(manager, message, confirmMsg, challengerConfirm, targetConfirm, amount, pot);
      }
    });

    confirmCollector.on('end', async (_, reason) => {
      if (reason === 'answered' || confirmed) return;
      activeGames.delete(challengerConfirm.id);
      activeGames.delete(targetConfirm.id);
      const timeoutEmbed = manager.sender.embed({
        color: manager.sender.colors.liveRed,
        title: '⏰ Süre Bitti',
        description: `<@${targetConfirm.id}> 30 saniye içinde cevap vermedi, teklif iptal edildi.`
      });
      confirmMsg.edit({ content: '', embeds: [timeoutEmbed], components: [] }).catch(() => {});
    });
  },
};

async function startGame(manager, message, confirmMsg, challenger, targetUser, amount, pot) {
  let pullOK = false;
  try {
    const cData = await Economy.findOne({ userId: challenger.id });
    const tData = await Economy.findOne({ userId: targetUser.id });
    if ((cData?.money ?? 0) < amount || (tData?.money ?? 0) < amount) {
      const failEmbed = manager.sender.embed({
        color: manager.sender.colors.liveRed,
        title: '❌ Hata',
        description: 'Onay sonrası bakiyelerde eksilme oldu, oyun iptal edildi.'
      });
      await confirmMsg.edit({ content: '', embeds: [failEmbed], components: [] }).catch(() => {});
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }
    cData.money -= amount;
    tData.money -= amount;
    await cData.save();
    await tData.save();
    pullOK = true;
  } catch (e) {
    activeGames.delete(challenger.id);
    activeGames.delete(targetUser.id);
    return;
  }

  if (!pullOK) return;

  const bulletPosition = Math.floor(Math.random() * 6);
  let currentPlayer = challenger;
  let otherPlayer = targetUser;
  let turnCount = 0;
  let dead = null;

  const buildChambers = (markedIndex, status) => {
    const chambers = [
      { name: '1️⃣', value: '●', inline: true },
      { name: '2️⃣', value: '●', inline: true },
      { name: '3️⃣', value: '●', inline: true },
      { name: '4️⃣', value: '●', inline: true },
      { name: '5️⃣', value: '●', inline: true },
      { name: '6️⃣', value: '●', inline: true }
    ];
    if (markedIndex !== null && markedIndex >= 0) {
      chambers[markedIndex] = { name: status.icon, value: status.text, inline: true };
    }
    return chambers;
  };

  const buildShootBtn = (disabled = false) => {
    const b = new Button();
    b.add('rr_shoot', 'Tetiğe Bas', b.style.Danger, '🔫', disabled);
    return b.build();
  };

  const startEmbed = manager.sender.embed({
    color: manager.sender.colors.orange,
    title: '🔫 Rus Ruleti Başladı!',
    description: `**Bahis:** ${amount} coin\n**Havuz:** ${pot} coin\n\nSıra: <@${currentPlayer.id}>\nAşağıdaki butona basarak tetiği çek! (30 saniye)`,
    fields: buildChambers(null, null),
    footer: { text: `Oyuncular: ${challenger.username} vs ${targetUser.username}` }
  });

  await confirmMsg.edit({ content: '', embeds: [startEmbed], components: [buildShootBtn()] }).catch(() => {});

  const runTurn = async () => {
    while (turnCount < 12 && !dead) {
      const currentBtnId = `rr_shoot_${turnCount}`;

      const turnBtns = new Button();
      turnBtns.add(currentBtnId, '🎯 Tetiğe Bas', turnBtns.style.Danger, '🔫', false);
      const turnRow = turnBtns.build();

      const liveEmbed = manager.sender.embed({
        color: manager.sender.colors.orange,
        title: `🔫 Tur ${turnCount + 1} - Sıra: ${currentPlayer.username}`,
        description: `**Bahis:** ${amount} coin\n**Havuz:** ${pot} coin\n\nSıra: <@${currentPlayer.id}>\nAşağıdaki butona basarak tetiği çek! (30 saniye)`,
        fields: buildChambers(null, null),
        footer: { text: `Oyuncular: ${challenger.username} vs ${targetUser.username}` }
      });

      try {
        await confirmMsg.edit({ embeds: [liveEmbed], components: [turnRow] });
      } catch (e) {
        break;
      }

      let clicked = false;
      let clickedInteraction = null;

      try {
        clickedInteraction = await confirmMsg.awaitMessageComponent({
          filter: (i) => i.customId === currentBtnId && i.user.id === currentPlayer.id,
          time: 30_000,
        });
        try { await clickedInteraction.deferUpdate(); } catch (_) {}
        clicked = true;
      } catch (e) {
        dead = currentPlayer;
        const timeoutEmbed = manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '⏰ Süre Bitti',
          description: `<@${currentPlayer.id}> 30 saniye içinde tetiğe basmadığı için **OTOMATİK OLARAK KAYBETTİ**!\n\n🏆 Kazanan: <@${otherPlayer.id}>\n **${pot} coin** kazananın hesabına yatırıldı.`
        });
        try { await confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }); } catch (_) {}
        break;
      }

      if (!clicked) break;

      const chamber = turnCount % 6;
      turnCount++;

      if (chamber === bulletPosition) {
        dead = currentPlayer;

        const deadEmbed = manager.sender.embed({
          color: manager.sender.colors.liveRed,
          title: '💥 BANG! Kurşun Çıktı!',
          description: `<@${dead.id}> **ÖLDÜ**! (${turnCount}. atış)\n\n🏆 Kazanan: <@${otherPlayer.id}>\n💰 **${pot} coin** kazananın hesabına yatırıldı.`,
          fields: buildChambers(chamber, { icon: '💥', text: '**Kurşun!**' }),
          footer: { text: `${challenger.username} vs ${targetUser.username}` }
        });
        try { await confirmMsg.edit({ embeds: [deadEmbed], components: [] }); } catch (_) {}
        break;
      }

      const nextEmbed = manager.sender.embed({
        color: manager.sender.colors.blue,
        title: `✅ ${turnCount}. Atış: Boş!`,
        description: `Şanslısın, kurşun çıkmadı.\n\nSıra: <@${otherPlayer.id}>\nTetiğe basmak için butona tıkla! (30 saniye)`,
        fields: buildChambers(chamber, { icon: '✅', text: 'Boş!' }),
        footer: { text: `${challenger.username} vs ${targetUser.username}` }
      });

      try { await confirmMsg.edit({ embeds: [nextEmbed], components: [buildShootBtn()] }); } catch (_) {}

      const swap = currentPlayer;
      currentPlayer = otherPlayer;
      otherPlayer = swap;

      await misc.delay(700);
    }

    if (dead) {
      const winnerId = dead.id === challenger.id ? targetUser.id : challenger.id;
      try {
        const winnerData = await Economy.findOne({ userId: winnerId }) || new Economy({ userId: winnerId });
        winnerData.money = (winnerData.money ?? 0) + pot;
        winnerData.xp = (winnerData.xp ?? 0) + 20;
        await winnerData.save();
      } catch (e) {
        console.error('[rusruleti] Para yatırma hatası:', e);
      }
    }

    activeGames.delete(challenger.id);
    activeGames.delete(targetUser.id);
  };

  await runTurn();
}
