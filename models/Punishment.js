import mongoose from 'mongoose';

const punishmentSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  type: String, // 'jail' | 'warn' | 'manual'
  reason: String,
  date: { type: Date, default: Date.now },
  duration: String, // jail için
  staffId: String,
});

export default mongoose.model('Punishment', punishmentSchema);
