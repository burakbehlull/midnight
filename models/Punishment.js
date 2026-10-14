import mongoose from 'mongoose';

const punishmentSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  recordId: Number,
  type: String, 
  reason: String,
  date: { type: Date, default: Date.now },
  duration: String,
  staffId: String,
  deleted: { type: Boolean, default: false }, 
  deletedAt: Date,
  deletedBy: String,
  active: { type: Boolean, default: false }, 
  expiresAt: Date,
  removedAt: Date,
  removedBy: String 
});

punishmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.recordId) {
    const maxRecord = await this.constructor.findOne({ 
      guildId: this.guildId, 
      userId: this.userId 
    }).sort({ recordId: -1 });
    this.recordId = maxRecord?.recordId ? maxRecord.recordId + 1 : 1;
  }
  next();
});

export default mongoose.model('Punishment', punishmentSchema);
