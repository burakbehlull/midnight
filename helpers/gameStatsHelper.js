import { GameStat } from '#models';

/**
 * Oyun istatistiklerini kaydeder.
 *
 * @param {string} guildId
 * @param {string} userId
 * @param {string} game - Komut adıyla aynı anahtar (ör. 'coinflip', 'wordbomb')
 * @param {object} opts
 * @param {number} [opts.play]  - Oynanan maç sayısı (varsayılan artış)
 * @param {number} [opts.win]   - Kazanılan maç sayısı
 * @param {number} [opts.loss]  - Kaybedilen maç sayısı
 * @param {number} [opts.draw]  - Berabere sayısı
 * @param {number} [opts.won]   - Kazanılan net coin
 * @param {number} [opts.lost]  - Kaybedilen net coin
 * @param {number} [opts.words] - Yazılan kelime sayısı (kelime oyunları için)
 */
export async function recordGame(guildId, userId, game, opts = {}) {
  if (!guildId || !userId || !game) return null;

  const {
    play = 0,
    win = 0,
    loss = 0,
    draw = 0,
    won = 0,
    lost = 0,
    words = 0,
  } = opts;

  const inc = {};
  if (play) inc.plays = play;
  if (win) inc.wins = win;
  if (loss) inc.losses = loss;
  if (draw) inc.draws = draw;
  if (won) inc.totalWon = won;
  if (lost) inc.totalLost = lost;
  if (words) inc.words = words;

  if (Object.keys(inc).length === 0) return null;

  try {
    return await GameStat.findOneAndUpdate(
      { guildId, userId, game },
      { $inc: inc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch {
    return null;
  }
}

export default { recordGame };
