import mongoose from 'mongoose';

const voiceFriendSchema = new mongoose.Schema({
  friendId: { type: String, required: true },
  friendName: { type: String, default: '' },
  totalTimeMs: { type: Number, default: 0 },
  sessions: { type: Number, default: 0 }
});

const messageFriendSchema = new mongoose.Schema({
  friendId: { type: String, required: true },
  friendName: { type: String, default: '' },
  interactions: { type: Number, default: 0 },
  lastInteraction: { type: Date, default: Date.now }
});

const userRelationsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },

  voiceFriends: {
    type: [voiceFriendSchema],
    default: []
  },

  messageFriends: {
    type: [messageFriendSchema],
    default: []
  }
});

userRelationsSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model('UserRelations', userRelationsSchema);
