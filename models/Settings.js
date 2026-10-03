import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  
  prefix: { type: String },

  tag: { type: String, default: null },
  registerFormat: { type: String, default: null, enum: [null, 'isim_yas', 'tag_isim_yas', 'isim', 'tag_isim', 'none'] },
  registerMode: { type: String, default: 'gender', enum: ['gender', 'single'] },
  singleRegisterRoleId: { type: String, default: null },
  
  vipRoleId: { type: String, default: null },
  photoRoleId: { type: String, default: null },
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
  confessionChannelId: { type: String, default: null },
  
  tagRoleStatus: { type: Boolean, default: false },
  tagRoleId: { type: String, default: null },

  selfRegisterMode: { type: String, default: null, enum: [null, 'single', 'dual'] },
  selfRegisterRoleId: { type: String, default: null },
  selfRegisterErkekRoleId: { type: String, default: null },
  selfRegisterKizRoleId: { type: String, default: null },
  selfRegisterMessageId: { type: String, default: null },
  selfRegisterChannelId: { type: String, default: null },
  selfRegisterCustomText: { type: String, default: null }
  
});

export default mongoose.model('Settings', settingsSchema);
