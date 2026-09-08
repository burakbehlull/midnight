import mongoose from 'mongoose';

const nicknameHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  oldNickname: { type: String, default: null },
  newNickname: { type: String, default: null },
  changedBy: { type: String, required: true },
  changedAt: { type: Date, default: Date.now }
});

nicknameHistorySchema.index({ userId: 1, guildId: 1, changedAt: -1 });

export default mongoose.model('NicknameHistory', nicknameHistorySchema);
