/**
 * Imgur sayfa URL'lerini Discord embed'lerinde gostermek icin dogrudan resim URL'ine cevirir.
 * Album URL'leri (imgur.com/a/XXXX) icin sayfayi cekip icindeki resim hash'lerini toplar.
 */

/**
 * Senkron: Basit URL donusumu. Album ici hash yoksa oldugu gibi doner.
 */
export function toDirectImgurSync(url) {
  if (typeof url !== 'string') return url;
  if (/i\.imgur\.com/.test(url)) return url;

  const albumHash = url.match(/imgur\.com\/a\/[^#?]+#([A-Za-z0-9]+)/);
  if (albumHash) {
    return `https://i.imgur.com/${albumHash[1]}.gif`;
  }

  const single = url.match(/imgur\.com\/([A-Za-z0-9]+)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  if (single) {
    return `https://i.imgur.com/${single[1]}.gif`;
  }

  return url;
}


async function fetchAlbumHashes(albumUrl) {
  try {
    const res = await fetch(albumUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return [];
    const html = await res.text();

    const hashes = new Set();

  
    const imgurRefs = html.match(/i\.imgur\.com\/([A-Za-z0-9]{5,8})/g);
    if (imgurRefs) {
      for (const ref of imgurRefs) {
        const hash = ref.split('/').pop();
        if (hash && !['oembed', 'remove', 'static'].includes(hash)) {
          hashes.add(hash);
        }
      }
    }

   
    const hashRegex = /"hash":"([A-Za-z0-9]{5,8})"/g;
    let match;
    while ((match = hashRegex.exec(html)) !== null) {
      hashes.add(match[1]);
    }

    return Array.from(hashes);
  } catch (e) {
    return [];
  }
}

/**
 * Asenkron: URL'yi dogrudan resim URL'ine cevirir.
 * Album ici hash olmayan URL'ler icin sayfayi cekip rastgele resim secer.
 */
export async function resolveGifUrl(url) {
  if (typeof url !== 'string') return url;

 
  if (/i\.imgur\.com/.test(url)) return url;


  const albumHash = url.match(/imgur\.com\/a\/[^#?]+#([A-Za-z0-9]+)/);
  if (albumHash) {
    return `https://i.imgur.com/${albumHash[1]}.gif`;
  }

  
  const single = url.match(/imgur\.com\/([A-Za-z0-9]+)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  if (single) {
    return `https://i.imgur.com/${single[1]}.gif`;
  }

  const albumMatch = url.match(/imgur\.com\/a\/([A-Za-z0-9]+)/i);
  if (albumMatch) {
    const hashes = await fetchAlbumHashes(url);
    if (hashes.length > 0) {
      const randomHash = hashes[Math.floor(Math.random() * hashes.length)];
      return `https://i.imgur.com/${randomHash}.gif`;
    }
  }

  return url;
}

/**
 * Bir URL dizisinden rastgele secip dogrudan resim URL'ine cevirir.
 */
export async function pickRandomGif(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return null;
  const url = urls[Math.floor(Math.random() * urls.length)];
  return resolveGifUrl(url);
}
