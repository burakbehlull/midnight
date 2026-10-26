import mongoose from 'mongoose';

const depositSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true },
    dailyRate: { type: Number, required: true },
    days: { type: Number, required: true },
    startedAt: { type: Date, default: Date.now },
    maturesAt: { type: Date, required: true },
    payout: { type: Number, required: true }
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['deposit', 'withdraw', 'term_open', 'term_close', 'loan_take', 'loan_pay'],
      required: true
    },
    amount: { type: Number, required: true },
    note: { type: String, default: null },
    time: { type: Date, default: Date.now }
  },
  { _id: false }
);

const bankAccountSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  bankId: { type: String, required: true },
  balance: { type: Number, default: 0 },
  deposits: { type: [depositSchema], default: [] },
  history: { type: [historySchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bankAccountSchema.index({ userId: 1, bankId: 1 }, { unique: true });

bankAccountSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('BankAccount', bankAccountSchema);
