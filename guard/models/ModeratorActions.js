import mongoose from 'mongoose';

/**
 * Ortak MongoDB üzerinden botlar arası paylaşılan moderatör işlem kaydı.
 * Moderation botu her ban/kick vb. işleminde buraya bir kayıt yazar; guard botu
 * aynı veritabanını okuyarak bir kullanıcının kaç işlem yaptığını görebilir.
 */
const moderatorActionsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true
  },
  moderatorId: {
    type: String,
    required: true
  },
  botId: {
    type: String,
    default: null
  },
  action: {
    type: String,
    required: true
  },
  targetId: {
    type: String,
    default: null
  },
  reason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

moderatorActionsSchema.index({ guildId: 1, moderatorId: 1, action: 1, createdAt: -1 });

moderatorActionsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model('ModeratorActions', moderatorActionsSchema);
