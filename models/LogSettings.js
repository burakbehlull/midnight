import mongoose from 'mongoose';

const LogSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  generalLogChannel: { type: String, default: null },
  banKickChannel: { type: String, default: null },
  roleChannel: { type: String, default: null },
  voiceChannel: { type: String, default: null },
  commandChannel: { type: String, default: null },
  joinLeaveChannel: { type: String, default: null },
  messageChannel: { type: String, default: null },
  channelChannel: { type: String, default: null },
  serverChannel: { type: String, default: null },
  muteChannel: { type: String, default: null }
});

export default mongoose.model('LogSettings', LogSettingsSchema);