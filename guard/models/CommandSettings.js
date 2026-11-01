import mongoose from 'mongoose';

const guardCommandSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    commandName: { type: String, required: true },

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

    exemptUsers: [{ type: String }],
    exemptRoles: [{ type: String }],

    guardWhitelistAllowed: { type: Boolean, default: false },

    enabled: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { collection: 'guard_command_settings' }
);

guardCommandSettingsSchema.index({ guildId: 1, commandName: 1 }, { unique: true });

guardCommandSettingsSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('GuardCommandSettings', guardCommandSettingsSchema);
