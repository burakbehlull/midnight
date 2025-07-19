import mongoose from 'mongoose';

const punishmentSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  type: String, 
  reason: String,
  date: { type: Date, default: Date.now },
  duration: String,
  staffId: String,
});

export default mongoose.model('Punishment', punishmentSchema);
