import { Economy, Shop } from '#models';

const DEFAULT_MODULE_SLUGS = new Set(['default', 'varsayılan']);

const MODULE_META = {
  spotify: {
    label: 'Spotify',
    emoji: '🎧',
    defaultSlug: 'default'
  }
};

function getModuleMeta(module) {
  return MODULE_META[module] || { label: module, emoji: '✨', defaultSlug: 'default' };
}

async function getOrCreateEconomy(userId) {
  let econ = await Economy.findOne({ userId });
  if (!econ) {
    econ = await Economy.create({ userId, money: 0 });
    return econ;
  }
  let needSave = false;
  if (!(econ.activeCosmetics instanceof Map)) {
    const raw = econ.activeCosmetics;
    econ.activeCosmetics = new Map();
    if (raw) {
      if (raw instanceof Map) {
        for (const [k, v] of raw.entries()) econ.activeCosmetics.set(String(k), String(v));
      } else if (typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) {
          if (v !== undefined && v !== null) econ.activeCosmetics.set(String(k), String(v));
        }
      }
    }
    needSave = true;
  }
  if (!(econ.inventory instanceof Map)) {
    const raw = econ.inventory;
    econ.inventory = new Map();
    if (raw) {
      if (raw instanceof Map) {
        for (const [k, v] of raw.entries()) econ.inventory.set(String(k), Number(v) || 0);
      } else if (typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) econ.inventory.set(String(k), Number(v) || 0);
      }
    }
    needSave = true;
  }
  if (needSave) {
    econ.markModified('activeCosmetics');
    econ.markModified('inventory');
    await econ.save().catch(() => {});
    econ = await Economy.findOne({ userId });
  }
  return econ;
}

function readCosmeticValue(raw, module) {
  const key = String(module);
  if (raw == null) return undefined;
  if (raw instanceof Map) {
    const v = raw.get(key);
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  if (typeof raw === 'object') {
    const v = raw[key];
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  return undefined;
}

function readInventoryCount(raw, itemId) {
  const key = String(itemId);
  if (raw == null) return 0;
  if (raw instanceof Map) {
    return Number(raw.get(key)) || 0;
  }
  if (typeof raw === 'object') {
    return Number(raw[key]) || 0;
  }
  return 0;
}

async function findShopItem(module, slugOrId) {
  const moduleLower = String(module).toLowerCase();
  const input = String(slugOrId).trim();
  const inputLower = input.toLowerCase();
  if (DEFAULT_MODULE_SLUGS.has(inputLower)) {
    return { isDefault: true, id: -1, module: moduleLower, slug: 'default', name: 'Default', price: 0, type: 'theme' };
  }
  const id = Number(input);
  const idQuery = !isNaN(id) && Number.isInteger(id) ? [{ id }] : [];
  const query = {
    $or: [
      ...idQuery,
      { module: moduleLower, slug: inputLower },
      { module: moduleLower, slug: input }
    ]
  };
  const item = await Shop.findOne(query).lean();
  if (!item) return null;
  return { ...item, isDefault: false };
}

async function ownsItem(userId, shopItem) {
  if (!shopItem) return false;
  if (shopItem.isDefault) return true;
  if (!shopItem.id || shopItem.id < 0) return true;
  const econ = await Economy.findOne({ userId }).select('inventory').lean();
  if (!econ) return false;
  const count = readInventoryCount(econ.inventory, shopItem.id);
  return count > 0;
}

async function getActiveCosmetic(userId, module) {
  const moduleLower = String(module).toLowerCase();
  const econ = await Economy.findOne({ userId }).select('activeCosmetics').lean();
  if (!econ) return getModuleMeta(moduleLower).defaultSlug;
  const active = readCosmeticValue(econ.activeCosmetics, moduleLower);
  return active || getModuleMeta(moduleLower).defaultSlug;
}

async function setActiveCosmetic(userId, module, slugOrId) {
  const input = String(slugOrId).trim();
  const inputLower = input.toLowerCase();
  const moduleLower = String(module).trim().toLowerCase();

  if (DEFAULT_MODULE_SLUGS.has(inputLower)) {
    const econ = await getOrCreateEconomy(userId);
    const current = readCosmeticValue(econ.activeCosmetics, moduleLower);
    if (!current || current === 'default') {
      return {
        ok: true,
        changed: false,
        item: { isDefault: true, module: moduleLower, slug: 'default', name: 'Default' },
        isDefault: true,
        message: `ℹ️ ${getModuleMeta(moduleLower).label} teması zaten **Default** olarak ayarlı.`
      };
    }
    if (econ.activeCosmetics instanceof Map) {
      econ.activeCosmetics.delete(moduleLower);
    } else if (econ.activeCosmetics && typeof econ.activeCosmetics === 'object') {
      delete econ.activeCosmetics[moduleLower];
    } else {
      econ.activeCosmetics = new Map();
    }
    econ.markModified('activeCosmetics');
    await econ.save();
    return {
      ok: true,
      changed: true,
      item: { isDefault: true, module: moduleLower, slug: 'default', name: 'Default' },
      isDefault: true
    };
  }

  const item = await findShopItem(moduleLower, input);
  if (!item) {
    return {
      ok: false,
      error: 'notfound',
      message: `❌ Geçersiz seçim. ${getModuleMeta(moduleLower).label} için geçerli bir tema/öğe bulunamadı. ID veya kod ismiyle tekrar dene.`
    };
  }

  const owned = await ownsItem(userId, item);
  if (!owned) {
    return {
      ok: false,
      error: 'notowned',
      item,
      message: `⚠️ **${item.name}** öğesini kullanabilmek için önce envanterinde bulundurman gerekiyor! Marketten (id:${item.id}, fiyat:${item.price} coin) satın alabilirsin.`
    };
  }

  const econ = await getOrCreateEconomy(userId);
  const current = readCosmeticValue(econ.activeCosmetics, moduleLower);
  if (current === item.slug) {
    return {
      ok: true,
      changed: false,
      item,
      message: `ℹ️ ${getModuleMeta(moduleLower).label} teması zaten **${item.name}** olarak ayarlı.`
    };
  }

  if (!(econ.activeCosmetics instanceof Map)) {
    const raw = econ.activeCosmetics;
    econ.activeCosmetics = new Map();
    if (raw && typeof raw === 'object') {
      if (raw instanceof Map) {
        for (const [k, v] of raw.entries()) econ.activeCosmetics.set(String(k), String(v));
      } else {
        for (const [k, v] of Object.entries(raw)) {
          if (v !== undefined && v !== null) econ.activeCosmetics.set(String(k), String(v));
        }
      }
    }
  }

  econ.activeCosmetics.set(moduleLower, String(item.slug));
  econ.markModified('activeCosmetics');
  await econ.save();

  const verify = await getActiveCosmetic(userId, moduleLower);
  if (verify !== item.slug) {
    return {
      ok: false,
      error: 'save_failed',
      message: `❌ Tema ayarlanırken bir veri hatası oluştu (db kaydedilmedi). Lütfen tekrar dene veya bot sahibine başvur. [debug: expected=${item.slug} got=${verify}]`
    };
  }

  return {
    ok: true,
    changed: true,
    item,
    message: `✅ ${getModuleMeta(moduleLower).label} teması artık **${item.name}** olarak ayarlandı!`
  };
}

async function listAvailableCosmetics(userId, module) {
  const moduleLower = String(module).trim().toLowerCase();
  const active = await getActiveCosmetic(userId, moduleLower);
  const shopItems = await Shop.find({
    $or: [
      { module: moduleLower, type: 'theme' },
      { module: moduleLower, type: 'cosmetic' }
    ]
  }).lean();
  const econ = await Economy.findOne({ userId }).select('inventory').lean();

  const available = [{
    id: -1,
    name: 'Default',
    slug: 'default',
    price: 0,
    owned: true,
    active: active === 'default',
    isDefault: true
  }];

  for (const item of shopItems) {
    const count = readInventoryCount(econ?.inventory, item.id);
    available.push({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      owned: count > 0,
      count,
      active: active === item.slug
    });
  }
  return available;
}

export {
  getModuleMeta,
  findShopItem,
  ownsItem,
  getActiveCosmetic,
  setActiveCosmetic,
  listAvailableCosmetics
};

