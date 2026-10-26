import mongoose from 'mongoose';

const gameStatSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  game: { type: String, required: true },

  plays: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },

  totalWon: { type: Number, default: 0 },
  totalLost: { type: Number, default: 0 },

  // Kelime türetmece gibi oyunlar için yazılan kelime sayısı
  words: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

gameStatSchema.index({ guildId: 1, userId: 1, game: 1 }, { unique: true });
gameStatSchema.index({ guildId: 1, game: 1 });

export default mongoose.model('GameStat', gameStatSchema);
