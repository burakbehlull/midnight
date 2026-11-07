import mongoose from 'mongoose';

const guildSettingsSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  safeguard: {
    enabled: { type: Boolean, default: false },
    safeRoles: [{ type: String }],
    safeUsers: [{ type: String }],
    allowedBots: [{ type: String }],
    whitelistBots: [{ type: String }],
    jailRole: { type: String, default: null }
  },

  backup: {
    enabled: { type: Boolean, default: false },
    interval: { type: Number, default: 6 * 60 * 60 * 1000 },
    lastBackup: { type: Date, default: null }
  },

  guards: {
    roleGuard: {
      create: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
      update: { type: Boolean, default: true }
    },
    channelGuard: {
      create: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
      update: { type: Boolean, default: true }
    },
    banGuard: { type: Boolean, default: true },
    kickGuard: { type: Boolean, default: true },
    roleAssignGuard: { type: Boolean, default: true },
    botGuard: { type: Boolean, default: true },
    globalLimit: { type: Number, default: 3 },
    guildUpdateGuard: { type: Boolean, default: true },
    vanityGuard: { type: Boolean, default: true },
    webhookGuard: { type: Boolean, default: true },
    spamGuard: { type: Boolean, default: true },
    advertisementGuard: { type: Boolean, default: true }
  },

  limits: {
    ban: { type: Number, default: 1 },
    kick: { type: Number, default: 1 },
    roleAssign: { type: Number, default: 1 },
    roleCreate: { type: Number, default: 1 },
    roleDelete: { type: Number, default: 1 },
    roleUpdate: { type: Number, default: 1 },
    channelCreate: { type: Number, default: 1 },
    channelDelete: { type: Number, default: 1 },
    channelUpdate: { type: Number, default: 1 }
  },

  limitPunishment: {
    type: [String],
    enum: ['ban', 'kick', 'removePerms', 'jail', 'closePerms', 'none'],
    default: ['removePerms']
  },

  protectedRoles: [{ type: String }],

  punishments: {
    roleDelete: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    roleCreate: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    roleUpdate: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    channelDelete: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    channelCreate: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    channelUpdate: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    ban: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    kick: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    roleAssign: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    botAdd: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    guildUpdate: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms'] }
    },
    vanityUpdate: {
      actions: [{ type: String, enum: ['ban', 'kick', 'removePerms', 'jail', 'none', 'closePerms'] }],
      default: { type: [String], default: ['removePerms', 'ban', 'closePerms'] }
    }
  },

  antiSpam: {
    enabled: { type: Boolean, default: true },
    maxWarnings: { type: Number, default: 3 },
    timeoutDuration: { type: Number, default: 600000 }
  },
  antiAdvertisement: {
    enabled: { type: Boolean, default: true },
    maxWarnings: { type: Number, default: 3 },
    timeoutDuration: { type: Number, default: 600000 }
  },

  logChannel: { type: String, default: null },

  voiceChannelId: { type: String, default: null },

  permissionsLocked: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

guildSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('GuildSettings', guildSettingsSchema);
