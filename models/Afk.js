import mongoose from 'mongoose';

const afkSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  reason: { type: String, default: null },
  originalNickname: { type: String, default: null },
  timestamp: { type: Date, default: Date.now }
});

afkSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model('Afk', afkSchema);
