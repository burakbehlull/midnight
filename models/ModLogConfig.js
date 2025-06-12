import mongoose from 'mongoose';

const modLogConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  modLogStatus: { type: Boolean, default: false },
  
  generalLogChannel: { type: String, default: null },
  logs: {
    command: { type: String, default: null },
    joinLeave: { type: String, default: null },
    message: { type: String, default: null },
    voice: { type: String, default: null },
    kickBan: { type: String, default: null },
	
    role: { type: String, default: null },
    channel: { type: String, default: null },
    moderation: { type: String, default: null }
  }
});

export default mongoose.model('ModLogConfig', modLogConfigSchema);
