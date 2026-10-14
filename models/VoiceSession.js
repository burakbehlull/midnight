import { Schema, model } from 'mongoose';

const voiceSessionSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  joinedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

voiceSessionSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default model('VoiceSession', voiceSessionSchema);
