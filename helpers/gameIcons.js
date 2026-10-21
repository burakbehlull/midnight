const DETECTABLE_URL = "https://discord.com/api/v10/applications/detectable";
const CACHE_TTL = 6 * 60 * 60 * 1000;

let cache = { at: 0, byId: null, byName: null };

function iconUrl(appId, hash, size = 1024) {
  return `https://cdn.discordapp.com/app-icons/${appId}/${hash}.png?size=${size}`;
}

export async function loadDetectable() {
  if (cache.byId && Date.now() - cache.at < CACHE_TTL) return cache;

  const res = await fetch(DETECTABLE_URL, {
    headers: { "User-Agent": "DiscordBot (midnight, 2.0.0)" },
  }).catch(() => null);
  if (!res?.ok) return cache;

  const list = await res.json().catch(() => null);
  if (!Array.isArray(list)) return cache;

  const byId = new Map();
  const byName = new Map();
  for (const app of list) {
    if (!app?.id) continue;
    byId.set(app.id, app);
    for (const name of [app.name, ...(app.aliases ?? [])]) {
      const key = String(name ?? "").trim().toLowerCase();
      if (key && !byName.has(key)) byName.set(key, app);
    }
  }

  cache = { at: Date.now(), byId, byName };
  return cache;
}

// Aktiviteye karşılık gelen oyunu önce applicationId, sonra isim/alias ile arar
export async function findDetectableApp(activity) {
  const { byId, byName } = await loadDetectable();
  if (!byId) return null;
  if (activity?.applicationId && byId.has(activity.applicationId)) {
    return byId.get(activity.applicationId);
  }
  return byName.get(String(activity?.name ?? "").trim().toLowerCase()) ?? null;
}

// Oyunun kendi resmi ikonu (Discord oyun listesinden)
export async function detectableIconUrls(activity) {
  const app = await findDetectableApp(activity);
  if (!app) return [];
  const urls = [];
  if (app.icon_hash) urls.push(iconUrl(app.id, app.icon_hash));
  if (app.cover_image_hash) urls.push(iconUrl(app.id, app.cover_image_hash));
  return urls;
}

// Rich Presence görselleri (oyun içi özel görsel varsa)
export function assetCoverUrls(activity) {
  const urls = [];
  const large = activity?.assets?.largeImage;
  const viaMethod = activity?.assets?.largeImageURL?.({ size: 1024, extension: "png" });
  if (viaMethod) urls.push(viaMethod);
  if (large && !large.includes(":") && activity.applicationId) {
    urls.push(`https://cdn.discordapp.com/app-assets/${activity.applicationId}/${large}.png?size=1024`);
  }
  return urls;
}

// Steam butonundan oyun kapak görseli
export function steamCoverUrls(activity) {
  const urls = [];
  for (const btn of activity?.buttons ?? []) {
    const url = typeof btn === "string" ? btn : btn?.url;
    const match = String(url ?? "").match(/steampowered\.com\/app\/(\d+)/);
    if (match) urls.push(`https://cdn.akamai.steamstatic.com/steam/apps/${match[1]}/header.jpg`);
  }
  return urls;
}

// Rich Presence görseli yoksa oyunun resmi ikonunu (ve Steam kapağını) döndürür
export async function appIconUrls(client, activity) {
  let urls = [];
  try {
    urls = await detectableIconUrls(activity);
  } catch {
    urls = [];
  }

  if (activity?.applicationId && client?.rest) {
    try {
      const app = await client.rest.get(`/applications/${activity.applicationId}`);
      if (app?.icon) urls.push(iconUrl(activity.applicationId, app.icon));
    } catch {
      // bot bu uygulamayı göremiyor olabilir, sorun değil
    }
  }

  return urls;
}

export async function fallbackCoverUrls(client, activity) {
  const urls = await appIconUrls(client, activity).catch(() => []);
  return [...urls, ...steamCoverUrls(activity)];
}
