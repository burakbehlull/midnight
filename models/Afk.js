import mongoose from 'mongoose';

const afkSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  reason: { type: String, default: 'AFK' },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Afk', afkSchema);
