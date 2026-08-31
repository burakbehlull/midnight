import mongoose from 'mongoose';

const holdingSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  amount: { type: Number, required: true, default: 0, min: 0 },
  avgBuyPrice: { type: Number, default: 0 }
}, { _id: false });

const txHistorySchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['BUY', 'SELL'] },
  symbol: { type: String, required: true },
  amount: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  total: { type: Number, required: true },
  time: { type: Date, default: Date.now }
}, { _id: false });

const portfolioSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  holdings: { type: [holdingSchema], default: [] },
  transactionHistory: { type: [txHistorySchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

portfolioSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.transactionHistory && this.transactionHistory.length > 30) {
    this.transactionHistory = this.transactionHistory.slice(-30);
  }
  next();
});

export default mongoose.model('UserPortfolio', portfolioSchema);
