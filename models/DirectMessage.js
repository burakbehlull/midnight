import mongoose from 'mongoose';

const directMessageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  globalName: { type: String, default: null },
  avatar: { type: String, default: null },
  messageContent: { type: String, required: true },
  messageId: { type: String, required: true },
  replied: { type: Boolean, default: false },
  replyContent: { type: String, default: null },
  repliedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

directMessageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('DirectMessage', directMessageSchema);
