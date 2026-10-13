import mongoose from 'mongoose';

const wordBuildingGameSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  
  lastWord: { type: String, default: null },
  lastUserId: { type: String, default: null },
  lastMessageId: { type: String, default: null },
  
  usedWords: { type: [String], default: [] },
  totalWords: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

wordBuildingGameSchema.index({ guildId: 1, channelId: 1 });

export default mongoose.model('WordBuildingGame', wordBuildingGameSchema);
