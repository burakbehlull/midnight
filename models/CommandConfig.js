import mongoose from 'mongoose';

const commandConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  commandName: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  cooldown: { type: Number, default: 3 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

commandConfigSchema.index({ guildId: 1, commandName: 1 }, { unique: true });

commandConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('CommandConfig', commandConfigSchema);
