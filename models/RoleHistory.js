import mongoose from 'mongoose';

const roleHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  roleIds: { type: [String], required: true },
  roleNames: { type: [String], required: true },
  action: { type: String, required: true, enum: ['add', 'remove', 'tag_remove'] },
  actionLabel: { type: String, required: true },
  changedBy: { type: String, default: null },
  changedByName: { type: String, default: 'Bilinmiyor' },
  changedAt: { type: Date, default: Date.now }
});

roleHistorySchema.index({ userId: 1, guildId: 1, changedAt: -1 });

export default mongoose.model('RoleHistory', roleHistorySchema);
