import { Schema, model } from 'mongoose';

const forceBanSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  bannedBy: {
    type: String,
    required: true,
  },
  bannedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    default: 'Sebep belirtilmedi',
  },
});

forceBanSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default model('ForceBan', forceBanSchema);
