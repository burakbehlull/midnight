import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  loanId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  bankId: { type: String, required: true },
  principal: { type: Number, required: true },
  dailyRate: { type: Number, required: true },
  overdueMultiplier: { type: Number, default: 4 },
  days: { type: Number, required: true },
  takenAt: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  owed: { type: Number, required: true },
  overdue: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'overdue', 'paid'], default: 'active' },
  lastAccruedAt: { type: Date, default: Date.now },
  paidAt: { type: Date, default: null }
});

loanSchema.index({ userId: 1, bankId: 1, status: 1 });

export default mongoose.model('BankLoan', loanSchema);
