import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  registerCount: { type: Number, default: 0 },
  startedStaffCount: { type: Number, default: 0 },
  startedUsers: [{ type: String }],
  startedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Staff', staffSchema);
