import Manager from '#managers';
import { Economy } from '#models';
import { Button, misc } from '#helpers';

const { delay } = misc;

const activeGames = new Set();

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board) {
  for (const [a, b, c] of WINNING_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every(cell => cell !== null);
}

function buildGridButtons(board, disabled, btnPrefix, turnMark) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new Button();
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const cell = board[idx];
      let label = '\u200b';
      let style = row.style.Secondary;
      let emoji = null;
      const cellDisabled = disabled || cell !== null;

      if (cell === 'X') {
        emoji = '❌';
        style = row.style.Secondary;
      } else if (cell === 'O') {
        emoji = '⭕';
        style = row.style.Secondary;
      } else if (!cellDisabled && !disabled) {
        style = row.style.Secondary;
      }

      row.add(`${btnPrefix}_${idx}`, label, style, emoji || null, cellDisabled);
    }
    rows.push(row.build());
  }
  return rows;
}

export default {
  name: 'xox',
  category: 'fun',
  aliases: ['ttt', 'tictactoe', 'tic-tac-toe', 'xo'],
  usage: '.xox @kullanıcı <miktar>',
  description: 'Rakibine karşı XOX (Tic-Tac-Toe) oynayın, kazanan tüm parayı alır.',
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
      return manager.sender.reply(manager.sender.errorEmbed('❌ Kendinle XOX oynayamazsın.'));
    }

    if (targetUser.bot) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Botlarla XOX oynayamazsın.'));
    }

    const MIN_BET = 50;
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

    const acceptBtns = new Button();
    acceptBtns.add(`xox_accept_${gameId}`, 'Kabul Et', acceptBtns.style.Success, '✅', false);
    acceptBtns.add(`xox_reject_${gameId}`, 'Reddet', acceptBtns.style.Danger, '❌', false);
    const acceptRow = acceptBtns.build();

    const offerEmbed = manager.sender.embed({
      color: manager.sender.colors.blue,
      title: 'XOX Oyunu Teklifi',
      description: `<@${challenger.id}> sana **${amount}** coin'lik XOX oyunu teklif etti!\n\nKabul ediyor musun? (30 saniye)`,
      footer: { text: 'Bahis: ' + amount + ' coin | Havuz: ' + (amount * 2) + ' coin' }
    });

    let confirmMsg;
    try {
      confirmMsg = await message.channel.send({ content: `<@${targetUser.id}>`, embeds: [offerEmbed], components: [acceptRow] });
    } catch (e) {
      activeGames.delete(challenger.id);
      activeGames.delete(targetUser.id);
      return;
    }

    let offerAccepted = false;
    try {
      const acceptInteraction = await confirmMsg.awaitMessageComponent({
        filter: (i) => (i.customId === `xox_accept_${gameId}` || i.customId === `xox_reject_${gameId}`) && i.user.id === targetUser.id,
        time: 30_000,
      });
      try { await acceptInteraction.deferUpdate(); } catch (_) {}

      if (acceptInteraction.customId === `xox_reject_${gameId}`) {
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
    const players = { X: challenger, O: targetUser };
    const marks = { [challenger.id]: 'X', [targetUser.id]: 'O' };
    const board = Array(9).fill(null);
    let currentMark = 'X';
    let currentPlayer = players[currentMark];
    let winner = null;
    let drawn = false;
    let resigned = null;

    const playTurn = async () => {
      while (!winner && !drawn && !resigned) {
        const otherId = currentMark === 'X' ? 'O' : 'X';
        const otherPlayer = players[otherId];

        const gridBtns = buildGridButtons(board, false, `xox_${gameId}`, currentMark);
        const resignBtn = new Button();
        resignBtn.add(`xox_resign_${gameId}_${currentPlayer.id}`, 'Pes Et', resignBtn.style.Secondary, '🏳️', false);
        const allRows = [...gridBtns, resignBtn.build()];

        const turnEmbed = manager.sender.embed({
          color: currentMark === 'X' ? manager.sender.colors.liveRed : manager.sender.colors.blue,
          title: `XOX - Sıra: ${currentPlayer.username}`,
          description:
            `**Bahis:** ${amount} coin\n` +
            `**Havuz:** ${pot} coin\n\n` +
            `❌ <@${challenger.id}>   vs   ⭕ <@${targetUser.id}>\n\n` +
            `Sıra: **<@${currentPlayer.id}>** (${currentMark === 'X' ? '❌' : '⭕'})`,
          footer: { text: 'Hamle yapmak için boş bir kutuya tıkla | 60 saniye' }
        });

        try {
          await confirmMsg.edit({ content: '', embeds: [turnEmbed], components: allRows });
        } catch (e) {
          break;
        }

        let chosen = null;
        try {
          const moveFilter = (i) => {
            if (i.customId === `xox_resign_${gameId}_${currentPlayer.id}` && i.user.id === currentPlayer.id) return true;
            if (!i.customId.startsWith(`xox_${gameId}_`)) return false;
            if (i.user.id !== currentPlayer.id) return false;
            const parts = i.customId.split('_');
            const idx = parseInt(parts[parts.length - 1]);
            return !isNaN(idx) && idx >= 0 && idx < 9 && board[idx] === null;
          };
          const interaction = await confirmMsg.awaitMessageComponent({
            filter: moveFilter,
            time: 60_000,
          });
          try { await interaction.deferUpdate(); } catch (_) {}

          if (interaction.customId.startsWith(`xox_resign_`)) {
            resigned = currentPlayer;
            break;
          }

          const parts = interaction.customId.split('_');
          const idx = parseInt(parts[parts.length - 1]);
          if (isNaN(idx) || idx < 0 || idx > 8 || board[idx] !== null) continue;
          chosen = idx;
        } catch (e) {
          resigned = currentPlayer;
          const timeoutEmbed = manager.sender.embed({
            color: manager.sender.colors.liveRed,
            title: '⏰ Süre Bitti',
            description: `<@${currentPlayer.id}> 60 saniye içinde hamle yapmadığı için **OTOMATİK OLARAK KAYBETTİ**!\n\n🏆 Kazanan: <@${otherPlayer.id}>\n💰 **${pot} coin** kazananın hesabına yatırıldı.`,
            footer: { text: `${challenger.username} vs ${targetUser.username}` }
          });
          try { await confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }); } catch (_) {}
          break;
        }

        if (resigned) break;

        board[chosen] = currentMark;
        const winMark = checkWinner(board);
        if (winMark) {
          winner = players[winMark];
          break;
        }
        if (isBoardFull(board)) {
          drawn = true;
          break;
        }

        currentMark = currentMark === 'X' ? 'O' : 'X';
        currentPlayer = players[currentMark];
        await delay(250);
      }
    };

    await playTurn();

    const loserId = resigned ? resigned.id : (winner ? (winner.id === challenger.id ? targetUser.id : challenger.id) : null);
    const finalGridRows = buildGridButtons(board, true, `xox_final_${gameId}`, null);

    if (resigned) {
      const winnerPlayer = resigned.id === challenger.id ? targetUser : challenger;
      try {
        await Economy.findOneAndUpdate(
          { userId: winnerPlayer.id },
          { $inc: { money: pot, xp: 15 } },
          { new: true }
        );
      } catch (e) {
        console.error('[xox] Pes ödeme hatası:', e);
      }

      const resignedEmbed = manager.sender.embed({
        color: manager.sender.colors.orange,
        title: '🏳️ XOX Oyunu - Pes Edildi!',
        description:
          `<@${resigned.id}> pes etti!\n\n` +
          `🏆 Kazanan: <@${winnerPlayer.id}>\n` +
          `💰 Ödül: **${pot.toLocaleString('tr-TR')}** coin`,
        footer: { text: `${challenger.username} vs ${targetUser.username}` }
      });
      try { await confirmMsg.edit({ embeds: [resignedEmbed], components: [...finalGridRows] }); } catch (_) {}

    } else if (winner) {
      try {
        await Economy.findOneAndUpdate(
          { userId: winner.id },
          { $inc: { money: pot, xp: 20 } },
          { new: true }
        );
      } catch (e) {
        console.error('[xox] Kazanan ödeme hatası:', e);
      }

      const winEmbed = manager.sender.embed({
        color: manager.sender.colors.green,
        title: '🎉 XOX - Kazanan!',
        description:
          `🏆 Kazanan: **<@${winner.id}>** (${marks[winner.id] === 'X' ? '❌' : '⭕'})\n\n` +
          `💰 Ödül: **${pot.toLocaleString('tr-TR')}** coin`,
        footer: { text: `${challenger.username} vs ${targetUser.username}` }
      });
      try { await confirmMsg.edit({ embeds: [winEmbed], components: [...finalGridRows] }); } catch (_) {}

    } else if (drawn) {
      try {
        await Economy.findOneAndUpdate({ userId: challenger.id }, { $inc: { money: amount } });
        await Economy.findOneAndUpdate({ userId: targetUser.id }, { $inc: { money: amount } });
      } catch (e) {
        console.error('[xox] Beraberlik para iadesi hatası:', e);
      }

      const drawEmbed = manager.sender.embed({
        color: manager.sender.colors.orange,
        title: '🤝 XOX - Berabere!',
        description:
          `Oyun berabere bitti.\n\n` +
          `💸 Her iki oyuncuya da **${amount.toLocaleString('tr-TR')}** coin iade edildi.`,
        footer: { text: `${challenger.username} vs ${targetUser.username}` }
      });
      try { await confirmMsg.edit({ embeds: [drawEmbed], components: [...finalGridRows] }); } catch (_) {}
    }

    activeGames.delete(challenger.id);
    activeGames.delete(targetUser.id);
  },
};
