import mongoose from 'mongoose';

const permissionOverwriteSchema = new mongoose.Schema({
  id: String,
  type: Number,
  allow: String,
  deny: String
});

const channelSchema = new mongoose.Schema({
  id: String,
  name: String,
  type: Number,
  position: Number,
  topic: String,
  nsfw: Boolean,
  rateLimitPerUser: Number,
  parentId: String,
  permissionOverwrites: [permissionOverwriteSchema],
  bitrate: Number,
  userLimit: Number
});

const roleSchema = new mongoose.Schema({
  id: String,
  name: String,
  color: Number,
  hoist: Boolean,
  position: Number,
  permissions: String,
  mentionable: Boolean,
  icon: String,
  unicodeEmoji: String,
  members: [String] 
});

const emojiSchema = new mongoose.Schema({
  id: String,
  name: String,
  animated: Boolean,
  url: String
});

const banSchema = new mongoose.Schema({
  userId: String,
  reason: String
});

const backupDataSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true 
  },

  roles: [roleSchema],

  channels: [channelSchema],

  guild: {
    name: String,
    description: String,
    icon: String,
    banner: String,
    splash: String,
    verificationLevel: Number,
    defaultMessageNotifications: Number,
    explicitContentFilter: Number,
    afkChannelId: String,
    afkTimeout: Number,
    systemChannelId: String,
    vanityURLCode: String
  },

  emojis: [emojiSchema],

  bans: [banSchema],

  backupDate: { 
    type: Date, 
    default: Date.now 
  }
});

backupDataSchema.index({ guildId: 1, backupDate: -1 });

export default mongoose.model('BackupData', backupDataSchema);
