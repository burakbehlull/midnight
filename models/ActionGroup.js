import mongoose from 'mongoose';

const actionGroupSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  groupId: { type: String, required: true, index: true },
  groupName: { type: String, required: true },
  description: { type: String, default: null },
  type: { type: String, default: null, enum: [null, 'emoji', 'button'] },
  roleMode: { type: String, default: 'multi', enum: ['single', 'multi'] },
  setupMessageId: { type: String, default: null },
  setupChannelId: { type: String, default: null },
  setupText: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

actionGroupSchema.index({ guildId: 1, groupId: 1 }, { unique: true });

export default mongoose.model('ActionGroup', actionGroupSchema);
