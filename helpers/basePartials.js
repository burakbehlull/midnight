export async function fetchPartialNeed(obj) {
  if (!obj) return null;
  try {
    if (obj.partial && typeof obj.fetch === 'function') {
      return await obj.fetch();
    }
    return obj;
  } catch (err) {
    if (err.code === 10008) {
      return obj;
    }
    console.error('[fetchPartialIfNeeded] Fetch başarısız:', err);
    return obj;
  }
}
