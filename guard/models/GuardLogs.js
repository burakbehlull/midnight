import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
  id: String,
  name: String,
  type: String // 'user', 'role', 'channel', 'bot'
}, { _id: false });

const guardLogsSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true,
    index: true
  },
  
  eventType: {
    type: String,
    required: true,
    enum: [
      'roleCreate', 'roleDelete', 'roleUpdate',
      'channelCreate', 'channelDelete', 'channelUpdate',
      'ban', 'kick', 'roleAssign',
      'botAdd', 'guildUpdate', 'vanityUpdate',
      'spam', 'advertisement', 'protectedRoleAssign'
    ]
  },

  executor: {
    id: String,
    tag: String
  },

  target: {
    type: targetSchema,
    default: null
  },

  punishments: [{
    type: String,
    enum: ['ban', 'kick', 'removePerms', 'jail', 'closePerms', 'timeout']
  }],

  details: {
    reason: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    limitExceeded: Boolean,
    currentCount: Number,
    maxLimit: Number
  },

  status: {
    type: String,
    enum: ['prevented', 'punished', 'logged', 'restored'],
    default: 'logged'
  },

  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

guardLogsSchema.index({ guildId: 1, timestamp: -1 });
guardLogsSchema.index({ guildId: 1, eventType: 1, timestamp: -1 });

export default mongoose.model('GuardLogs', guardLogsSchema);
