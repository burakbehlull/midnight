export async function fetchPartialIfNeeded(obj) {
  if (!obj) return null;
  try {
    if (obj.partial && typeof obj.fetch === 'function') {
      return await obj.fetch();
    }
    return obj;
  } catch (err) {
    console.error('[fetchPartialIfNeeded] Fetch başarısız:', err);
    return obj;
  }
}
