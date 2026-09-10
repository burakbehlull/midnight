import mongoose from 'mongoose';

const boosterRoleSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  roleId: { type: String, required: true },
  roleName: { type: String, required: true },
  emojiId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastEdited: { type: Date, default: Date.now },
  members: {
    type: [String],
    default: []
  }
});

boosterRoleSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model('BoosterRole', boosterRoleSchema);
