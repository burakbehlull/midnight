import { MarketItem, UserPortfolio, Economy } from '#models';

const RISK_RANGES = {
  1: { minPct: 0.003, maxPct: 0.018, label: 'Güvenli' },
  2: { minPct: 0.008, maxPct: 0.04, label: 'Düşük' },
  3: { minPct: 0.025, maxPct: 0.075, label: 'Orta' },
  4: { minPct: 0.045, maxPct: 0.12, label: 'Yüksek' },
  5: { minPct: 0.08, maxPct: 0.23, label: 'Aşırı' }
};

const DEFAULT_ITEMS = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    emoji: '🔴',
    color: '#F7931A',
    category: 'crypto',
    riskLevel: 5,
    basePrice: 500,
    minPrice: 200,
    maxPrice: 1400
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    emoji: '🟢',
    color: '#627EEA',
    category: 'crypto',
    riskLevel: 4,
    basePrice: 300,
    minPrice: 120,
    maxPrice: 900
  },
  {
    symbol: 'SOL',
    name: 'Solaris',
    emoji: '🟡',
    color: '#14F195',
    category: 'crypto',
    riskLevel: 4,
    basePrice: 150,
    minPrice: 50,
    maxPrice: 450
  },
  {
    symbol: 'DOGE',
    name: 'DodgeCoin',
    emoji: '🟠',
    color: '#C3A634',
    category: 'crypto',
    riskLevel: 5,
    basePrice: 80,
    minPrice: 20,
    maxPrice: 280
  },
  {
    symbol: 'GOLD',
    name: 'Altın',
    emoji: '🟨',
    color: '#FFD700',
    category: 'metal',
    riskLevel: 1,
    basePrice: 200,
    minPrice: 150,
    maxPrice: 320
  },
  {
    symbol: 'SILVER',
    name: 'Gümüş',
    emoji: '⚪',
    color: '#C0C0C0',
    category: 'metal',
    riskLevel: 2,
    basePrice: 40,
    minPrice: 25,
    maxPrice: 80
  },
  {
    symbol: 'PLATIN',
    name: 'Platin',
    emoji: '🔘',
    color: '#E5E4E2',
    category: 'metal',
    riskLevel: 2,
    basePrice: 350,
    minPrice: 220,
    maxPrice: 520
  },
  {
    symbol: 'DIAMOND',
    name: 'Elmas',
    emoji: '💎',
    color: '#B9F2FF',
    category: 'metal',
    riskLevel: 1,
    basePrice: 1000,
    minPrice: 700,
    maxPrice: 1600
  },
  {
    symbol: 'MIGUEL COIN',
    name: 'MiguelCoin',
    emoji: '🟣',
    color: '#9932CC',
    category: 'custom',
    riskLevel: 5,
    basePrice: 250,
    minPrice: 50,
    maxPrice: 800
  },
  {
    symbol: 'MIDNIGHT COIN',
    name: 'MidnightToken',
    emoji: '🔵',
    color: '#0B3D91',
    category: 'custom',
    riskLevel: 3,
    basePrice: 88,
    minPrice: 30,
    maxPrice: 260
  }
];

function buildInitialItems() {
  return DEFAULT_ITEMS.map(it => {
    const risk = RISK_RANGES[it.riskLevel];
    return {
      symbol: it.symbol,
      name: it.name,
      emoji: it.emoji,
      color: it.color,
      category: it.category,
      riskLevel: it.riskLevel,
      riskLabel: risk.label,
      price: it.basePrice,
      previousPrice: it.basePrice,
      basePrice: it.basePrice,
      minPrice: it.minPrice,
      maxPrice: it.maxPrice,
      allTimeHigh: it.basePrice,
      allTimeLow: it.basePrice
    };
  });
}

export async function getOrCreateMarket() {
  let doc = await MarketItem.findOne({ key: 'main' }).lean();
  if (!doc) {
    const items = buildInitialItems();
    doc = await MarketItem.create({ key: 'main', items });
    doc = doc.toObject();
  }
  if (!doc.items || doc.items.length === 0) {
    const items = buildInitialItems();
    const updated = await MarketItem.findOneAndUpdate(
      { key: 'main' },
      { $set: { items } },
      { new: true, upsert: true }
    ).lean();
    return updated;
  }
  return doc;
}

export function getItemsByCategory(items) {
  return {
    crypto: items.filter(i => i.category === 'crypto'),
    metal: items.filter(i => i.category === 'metal'),
    custom: items.filter(i => i.category === 'custom')
  };
}

export function calcChangePercent(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function pickRandomSign() {
  return Math.random() < 0.48 ? -1 : 1;
}

export async function updateMarketPrices() {
  const market = await MarketItem.findOne({ key: 'main' });
  if (!market) return null;

  const updatedItems = market.items.map(item => {
    const range = RISK_RANGES[item.riskLevel];
    const magnitude = range.minPct + Math.random() * (range.maxPct - range.minPct);
    const sign = pickRandomSign();
    const changePct = sign * magnitude;

    let newPrice = item.price * (1 + changePct);
    newPrice = Math.max(item.minPrice, Math.min(item.maxPrice, newPrice));
    newPrice = Math.round(newPrice * 100) / 100;

    const previousPrice = item.price;
    const allTimeHigh = Math.max(item.allTimeHigh, newPrice);
    const allTimeLow = Math.min(item.allTimeLow, newPrice);

    return {
      ...item,
      previousPrice,
      price: newPrice,
      allTimeHigh,
      allTimeLow
    };
  });

  market.items = updatedItems;
  const saved = await market.save();
  return saved.toObject();
}

export async function getOrCreatePortfolio(userId) {
  let pf = await UserPortfolio.findOne({ userId }).lean();
  if (!pf) {
    pf = await UserPortfolio.create({ userId, holdings: [], transactionHistory: [] });
    pf = pf.toObject();
  }
  return pf;
}

export function findItemBySymbol(items, symbol) {
  const up = symbol.toUpperCase();
  return items.find(i => i.symbol.toUpperCase() === up) || null;
}

export function getHolding(portfolio, symbol) {
  if (!portfolio || !portfolio.holdings) return null;
  const up = symbol.toUpperCase();
  return portfolio.holdings.find(h => h.symbol.toUpperCase() === up) || null;
}

export function computePortfolioValue(portfolio, marketItems) {
  if (!portfolio || !portfolio.holdings) return { total: 0, costBasis: 0 };
  let total = 0;
  let costBasis = 0;
  for (const h of portfolio.holdings) {
    const item = findItemBySymbol(marketItems, h.symbol);
    const price = item ? item.price : 0;
    total += h.amount * price;
    costBasis += h.amount * (h.avgBuyPrice || price);
  }
  return {
    total: Math.round(total * 100) / 100,
    costBasis: Math.round(costBasis * 100) / 100
  };
}

export async function performBuy(userId, symbol, amountRaw, marketItems) {
  const item = findItemBySymbol(marketItems, symbol);
  if (!item) return { ok: false, error: 'Varlık bulunamadı.' };
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Geçersiz miktar.' };

  const unitPrice = item.price;
  const total = Math.round(unitPrice * amount * 100) / 100;

  const econ = await Economy.findOneAndUpdate(
    { userId },
    { $inc: { money: -total } },
    { new: true, runValidators: true }
  ).catch(() => null);

  if (!econ) {
    return { ok: false, error: 'Economy kaydı bulunamadı.' };
  }
  if (econ.money < 0) {
    await Economy.findOneAndUpdate({ userId }, { $inc: { money: total } });
    return { ok: false, error: 'Yetersiz bakiye.' };
  }

  const pfDoc = await UserPortfolio.findOne({ userId });
  if (!pfDoc) {
    const newPf = await UserPortfolio.create({
      userId,
      holdings: [{ symbol: item.symbol, amount, avgBuyPrice: unitPrice }],
      transactionHistory: [{ type: 'BUY', symbol: item.symbol, amount, pricePerUnit: unitPrice, total }]
    });
    return {
      ok: true,
      action: 'BUY',
      symbol: item.symbol,
      name: item.name,
      emoji: item.emoji,
      amount,
      unitPrice,
      total,
      portfolio: newPf.toObject()
    };
  }

  const existingIdx = pfDoc.holdings.findIndex(h => h.symbol.toUpperCase() === item.symbol.toUpperCase());
  if (existingIdx >= 0) {
    const ex = pfDoc.holdings[existingIdx];
    const totalExistingUnits = ex.amount + amount;
    const newAvg = ((ex.amount * (ex.avgBuyPrice || unitPrice)) + (amount * unitPrice)) / totalExistingUnits;
    pfDoc.holdings[existingIdx] = {
      symbol: ex.symbol,
      amount: Math.round(totalExistingUnits * 1e8) / 1e8,
      avgBuyPrice: Math.round(newAvg * 100) / 100
    };
  } else {
    pfDoc.holdings.push({ symbol: item.symbol, amount, avgBuyPrice: unitPrice });
  }

  pfDoc.transactionHistory = pfDoc.transactionHistory || [];
  pfDoc.transactionHistory.push({
    type: 'BUY',
    symbol: item.symbol,
    amount,
    pricePerUnit: unitPrice,
    total
  });

  const saved = await pfDoc.save();
  return {
    ok: true,
    action: 'BUY',
    symbol: item.symbol,
    name: item.name,
    emoji: item.emoji,
    amount,
    unitPrice,
    total,
    portfolio: saved.toObject()
  };
}

export async function performSell(userId, symbol, amountRaw, marketItems) {
  const item = findItemBySymbol(marketItems, symbol);
  if (!item) return { ok: false, error: 'Varlık bulunamadı.' };
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Geçersiz miktar.' };

  const pfDoc = await UserPortfolio.findOne({ userId });
  if (!pfDoc) return { ok: false, error: 'Portföyünüz bulunamadı.' };

  const idx = pfDoc.holdings.findIndex(h => h.symbol.toUpperCase() === item.symbol.toUpperCase());
  if (idx < 0) return { ok: false, error: 'Bu varlıktan elinizde yok.' };
  const holding = pfDoc.holdings[idx];
  if (holding.amount < amount) {
    return {
      ok: false,
      error: `Elinizde sadece ${holding.amount} adet var.`
    };
  }

  const unitPrice = item.price;
  const total = Math.round(unitPrice * amount * 100) / 100;

  holding.amount = Math.round((holding.amount - amount) * 1e8) / 1e8;
  if (holding.amount <= 0) {
    pfDoc.holdings.splice(idx, 1);
  }

  pfDoc.transactionHistory = pfDoc.transactionHistory || [];
  pfDoc.transactionHistory.push({
    type: 'SELL',
    symbol: item.symbol,
    amount,
    pricePerUnit: unitPrice,
    total
  });

  const savedPf = await pfDoc.save();

  await Economy.findOneAndUpdate(
    { userId },
    { $inc: { money: total } },
    { new: true, upsert: false }
  ).catch(() => null);

  return {
    ok: true,
    action: 'SELL',
    symbol: item.symbol,
    name: item.name,
    emoji: item.emoji,
    amount,
    unitPrice,
    total,
    portfolio: savedPf.toObject()
  };
}

export { RISK_RANGES, DEFAULT_ITEMS };
