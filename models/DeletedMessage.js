import mongoose from 'mongoose';

const deletedMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  channelName: { type: String, default: 'unknown' },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  globalName: { type: String, default: null },
  avatar: { type: String, default: null },
  content: { type: String, default: null },
  attachments: [{
    url: String,
    proxyUrl: String,
    filename: String,
    contentType: String,
    size: Number
  }],
  embeds: { type: Array, default: [] },
  deletedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

deletedMessageSchema.index({ guildId: 1, deletedAt: -1 });

export default mongoose.model('DeletedMessage', deletedMessageSchema);
