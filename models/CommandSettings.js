import mongoose from 'mongoose';

const commandSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  commandName: { type: String, required: true },
  
  channelMode: { 
    type: String, 
    enum: ['off', 'whitelist', 'blacklist'], 
    default: 'off' 
  },
  allowedChannels: [{ type: String }],
  blockedChannels: [{ type: String }],
  
  roleMode: { 
    type: String, 
    enum: ['off', 'whitelist', 'blacklist'], 
    default: 'off' 
  },
  allowedRoles: [{ type: String }],
  blockedRoles: [{ type: String }],
  
  userMode: { 
    type: String, 
    enum: ['off', 'whitelist', 'blacklist'], 
    default: 'off' 
  },
  allowedUsers: [{ type: String }],
  blockedUsers: [{ type: String }],
  
  autoDelete: { type: Boolean, default: false },
  deleteAfter: { type: Number, default: 0 },
  
  customCooldown: { type: Number, default: null },

  exemptUsers: [{ type: String }],
  exemptRoles: [{ type: String }],
  
  enabled: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

commandSettingsSchema.index({ guildId: 1, commandName: 1 }, { unique: true });

commandSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('CommandSettings', commandSettingsSchema);
