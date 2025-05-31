import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  tag: { type: String, default: null },
  yetkiler: { type: Boolean, default: true },
  vipRoleId: { type: String, default: null },
  streamerRoleId: { type: String, default: null },
  autoRoleId: { type: String, default: null }
});

export default mongoose.model('Settings', settingsSchema);
