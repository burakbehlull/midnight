import mongoose from 'mongoose';

const economySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  money: { type: Number, default: 0 },
  cookies: { type: Number, default: 0 },
  hearts: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  marriedTo: { type: String, default: null },
  marriageSince: { type: Date, default: null },
  inventory: {
    type: Map,
    of: Number, // itemId -> count
    default: {}
  },
  cooldowns: {
    daily: { type: Date, default: new Date(0) },
    heart: { type: Date, default: new Date(0) },
    cookie: { type: Date, default: new Date(0) }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

economySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Economy', economySchema);
