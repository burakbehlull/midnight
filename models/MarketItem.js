import mongoose from 'mongoose';

const marketItemSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'main' },
  lastUpdate: { type: Date, default: Date.now },
  items: {
    type: [
      {
        symbol: { type: String, required: true },
        name: { type: String, required: true },
        emoji: { type: String, required: true },
        color: { type: String, required: true },
        category: { type: String, required: true, enum: ['crypto', 'metal', 'custom'] },
        riskLevel: { type: Number, required: true, min: 1, max: 5 },
        riskLabel: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        previousPrice: { type: Number, required: true, min: 0 },
        basePrice: { type: Number, required: true, min: 0 },
        minPrice: { type: Number, required: true, min: 0 },
        maxPrice: { type: Number, required: true, min: 0 },
        allTimeHigh: { type: Number, required: true, min: 0 },
        allTimeLow: { type: Number, required: true, min: 0 },
      }
    ],
    required: true,
    default: []
  }
});

marketItemSchema.pre('save', function(next) {
  this.lastUpdate = Date.now();
  next();
});

export default mongoose.model('MarketItem', marketItemSchema);
