import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  tag: { type: String, default: null },
  
  vipRoleId: { type: String, default: null },
  streamerRoleId: { type: String, default: null },
  autoRoleId: { type: String, default: null },
  erkekRoleId: { type: String, default: null },
  kizRoleId: { type: String, default: null },
  kayitsizRoleId: { type: String, default: null },
  
  staffRole: { type: String, default: null },
  jailRoleId: { type: String, default: null },
  
  inviteLogChannelId: { type: String, default: null },
  
  inviteLogStatus: { type: Boolean, default: false },
  otorolStatus: { type: Boolean, default: false },
  levelSystemStatus: { type: Boolean, default: false },
  statSystemStatus: { type: Boolean, default: false },
  confessionChannelId: { type: String, default: null }
  
});

export default mongoose.model('Settings', settingsSchema);
