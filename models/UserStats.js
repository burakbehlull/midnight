import mongoose from 'mongoose';

const messageChannelSchema = new mongoose.Schema({
  channelId: { type: String, required: true },
  count: { type: Number, default: 0 }
});

const voiceChannelSchema = new mongoose.Schema({
  channelId: { type: String, required: true },
  duration: { type: Number, default: 0 }
});

const userStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },

  totalMessages: { type: Number, default: 0 },
  totalVoice: { type: Number, default: 0 },

  messagePerDay: {
    type: Map,
    of: Number,
    default: () => new Map()
  },

  voicePerDay: {
    type: Map,
    of: Number,
    default: () => new Map()
  },

  messageChannels: {
    type: [messageChannelSchema],
    default: []
  },

  voiceChannels: {
    type: [voiceChannelSchema],
    default: []
  }
});

userStatsSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model('UserStats', userStatsSchema);
