import { Bank, BankAccount, BankLoan, Economy } from '#models';
import { randomUUID } from 'crypto';

export const CENTRAL_BANK_ID = 'midnight-merkez';
export const BANK_CAPITAL = 1000000;

export const TERM_DAYS = [7, 14, 21, 30];
export const TERM_RATE_KEY = { 7: 'd7', 14: 'd14', 21: 'd21', 30: 'd30' };
export const LOAN_DAYS = [3, 7, 14];

const MS_PER_DAY = 86400000;

export const HISTORY_LABELS = {
  deposit: '💰 Vadesiz Yatırma',
  withdraw: '💸 Vadesiz Çekme',
  term_open: '📈 Vadeli Açılış',
  term_close: '🏁 Vadeli Kapanış',
  loan_take: '💳 Kredi Çekimi',
  loan_pay: '✅ Kredi Ödemesi'
};

export async function ensureCentralBank() {
  let bank = await Bank.findOne({ bankId: CENTRAL_BANK_ID });
  if (!bank) {
    bank = await Bank.create({
      bankId: CENTRAL_BANK_ID,
      name: 'Midnight Merkez Bankası',
      emoji: '🏛️',
      ownerId: null,
      ownerName: 'Midnight Yönetimi',
      partners: [],
      partnerNames: [],
      capital: 0,
      reserve: 0,
      isCentral: true,
      status: 'active',
      rates: { demand: 0, d7: 1.0, d14: 1.2, d21: 1.4, d30: 1.6, loan: 2.0, overdueMultiplier: 4 }
    });
  }
  return bank;
}

export async function getBank(bankId) {
  return Bank.findOne({ bankId });
}

export async function listActiveBanks() {
  return Bank.find({ status: 'active' }).sort({ isCentral: -1, createdAt: 1 });
}

export async function getOrCreateAccount(userId, bankId) {
  let acc = await BankAccount.findOne({ userId, bankId });
  if (!acc) acc = await BankAccount.create({ userId, bankId, balance: 0 });
  return acc;
}

export async function getAccountsOf(userId) {
  return BankAccount.find({ userId });
}

export function pushHistory(account, type, amount, note = null) {
  account.history.push({ type, amount, note, time: new Date() });
  if (account.history.length > 50) account.history = account.history.slice(-50);
}

export function calcTermPayout(amount, dailyRate, days) {
  return Math.floor(amount * (1 + (dailyRate / 100) * days));
}

export function isPartner(bank, userId) {
  if (!bank || bank.isCentral) return false;
  if (bank.ownerId === userId) return true;
  return (bank.partners || []).includes(userId);
}

export async function getManagedBanks(userId) {
  if (!userId) return [];
  return Bank.find({
    status: 'active',
    isCentral: false,
    $or: [{ ownerId: userId }, { partners: userId }]
  });
}

export async function hasManagedBank(userId) {
  if (!userId) return false;
  const count = await Bank.countDocuments({
    status: 'active',
    isCentral: false,
    $or: [{ ownerId: userId }, { partners: userId }]
  });
  return count > 0;
}

export function fmtMoney(n) {
  return Math.floor(Number(n) || 0).toLocaleString('tr-TR');
}

export async function computeBankValue(bank) {
  const loans = await BankLoan.find({ bankId: bank.bankId, status: { $in: ['active', 'overdue'] } });
  const loanTotal = loans.reduce((s, l) => s + (l.owed || 0), 0);
  return {
    value: Math.floor((bank.reserve || 0) + loanTotal),
    capital: Math.floor(bank.capital || 0),
    reserve: Math.floor(bank.reserve || 0),
    loanTotal: Math.floor(loanTotal),
    loanCount: loans.length
  };
}

export async function getBankTotals(bankId) {
  const accounts = await BankAccount.find({ bankId });
  const depositTotal = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const termTotal = accounts.reduce(
    (s, a) => s + (a.deposits || []).reduce((x, d) => x + (d.amount || 0), 0),
    0
  );
  const loans = await BankLoan.find({ bankId, status: { $in: ['active', 'overdue'] } });
  const loanTotal = loans.reduce((s, l) => s + (l.owed || 0), 0);
  const loanPrincipal = loans.reduce((s, l) => s + (l.principal || 0), 0);
  return {
    accounts,
    accountCount: accounts.length,
    depositTotal: Math.floor(depositTotal),
    termTotal: Math.floor(termTotal),
    loans,
    loanCount: loans.length,
    loanTotal: Math.floor(loanTotal),
    loanPrincipal: Math.floor(loanPrincipal)
  };
}

export function accrueLoan(loan, now = new Date()) {
  const last = new Date(loan.lastAccruedAt || loan.takenAt);
  const due = new Date(loan.dueDate);
  const mult = loan.overdueMultiplier || 4;
  if (now <= last) return loan.owed;

  const normalEnd = now < due ? now : due;
  const normalDays = Math.max(0, (normalEnd - last) / MS_PER_DAY);
  const overdueStart = due > last ? due : last;
  const overdueDays = now > overdueStart ? (now - overdueStart) / MS_PER_DAY : 0;

  const interest = loan.principal * (loan.dailyRate / 100) * (normalDays + overdueDays * mult);
  loan.owed = Math.floor(loan.owed + interest);
  loan.lastAccruedAt = now;

  if (now >= due && loan.status !== 'paid') {
    loan.overdue = true;
    loan.status = 'overdue';
  }
  return loan.owed;
}

export async function getUserLoans(userId, bankId = null) {
  const query = { userId, status: { $in: ['active', 'overdue'] } };
  if (bankId) query.bankId = bankId;
  const loans = await BankLoan.find(query);
  for (const loan of loans) {
    const before = loan.owed;
    accrueLoan(loan);
    if (loan.owed !== before || loan.isModified('lastAccruedAt') || loan.isModified('status')) {
      await loan.save().catch(() => {});
    }
  }
  return loans;
}

export async function processBankInterest(now = new Date()) {
  const result = { matured: 0, paid: 0, loansUpdated: 0 };

  const accounts = await BankAccount.find({ deposits: { $ne: [] } });
  for (const acc of accounts) {
    const matured = (acc.deposits || []).filter((d) => new Date(d.maturesAt) <= now);
    if (matured.length === 0) continue;

    let totalPayout = 0;
    for (const d of matured) {
      totalPayout += d.payout || 0;
      pushHistory(acc, 'term_close', d.payout, `${d.days} gün vadeli · anapara ${d.amount} · oran %${d.dailyRate}/gün`);
    }
    acc.deposits = acc.deposits.filter((d) => new Date(d.maturesAt) > now);
    await acc.save().catch(() => {});

    if (totalPayout > 0) {
      await Economy.findOneAndUpdate(
        { userId: acc.userId },
        { $inc: { money: totalPayout } },
        { upsert: true }
      ).catch(() => {});
      await Bank.findOneAndUpdate({ bankId: acc.bankId }, { $inc: { reserve: -totalPayout } }).catch(() => {});
    }

    result.matured += matured.length;
    result.paid += totalPayout;
  }

  const loans = await BankLoan.find({ status: { $in: ['active', 'overdue'] } });
  for (const loan of loans) {
    const before = loan.owed;
    const beforeStatus = loan.status;
    accrueLoan(loan, now);
    if (loan.owed !== before || loan.status !== beforeStatus) {
      await loan.save().catch(() => {});
      result.loansUpdated++;
    }
  }

  return result;
}

export function newLoanId() {
  return `loan_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

export function newDepositId() {
  return `dep_${Date.now()}_${randomUUID().slice(0, 8)}`;
}
