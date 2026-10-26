import mongoose from 'mongoose';

const bankSchema = new mongoose.Schema({
  bankId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  emoji: { type: String, default: '🏦' },
  ownerId: { type: String, default: null },
  ownerName: { type: String, default: null },
  partners: { type: [String], default: [] },
  partnerNames: { type: [String], default: [] },
  capital: { type: Number, default: 0 },
  reserve: { type: Number, default: 0 },
  isCentral: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'pending'], default: 'active' },
  rates: {
    demand: { type: Number, default: 0 },
    d7: { type: Number, default: 1.0 },
    d14: { type: Number, default: 1.2 },
    d21: { type: Number, default: 1.4 },
    d30: { type: Number, default: 1.6 },
    loan: { type: Number, default: 2.0 },
    overdueMultiplier: { type: Number, default: 4 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bankSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Bank', bankSchema);
