const SERPER_SEARCH = 'https://google.serper.dev/search';
const SERPER_IMAGES = 'https://google.serper.dev/images';

const DIRECT_RETAILERS = [
  'trendyol.com', 'hepsiburada.com', 'amazon.com.tr', 'amazon.com', 'n11.com',
  'pttavm.com', 'pazarama.com', 'teknosa.com', 'mediamarkt.com.tr', 'koctas.com.tr',
  'vatanbilgisayar.com', 'idefix.com', 'boyner.com.tr', 'carrefoursa.com',
  'migros.com.tr', 'beko.com.tr', 'arcelik.com.tr', 'bosch-home.com.tr',
  'samsung.com', 'mi.com', 'apple.com', 'kumtel.com'
];

const BLOCKED_COMPARATORS = [
  'cimri.com', 'akakce.com', 'akakçe.com', 'onual.com', 'epey.com',
  'ucuzcu.com', 'fiyat.com', 'enuygun.com'
];

const CATEGORY_WORDS = [
  'vantilatör', 'telefon', 'televizyon', 'laptop', 'bilgisayar', 'tablet',
  'kulaklık', 'süpürge', 'kahve makinesi', 'klima', 'buzdolabı', 'çamaşır makinesi',
  'bulaşık makinesi', 'fırın', 'airfryer', 'matkap', 'ayakkabı', 'çanta', 'saat'
];

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function cleanKey() {
  return String(process.env.SERPER_API_KEY || '').trim().replace(/^["']|["']$/g, '');
}

function host(link = '') {
  try { return new URL(link).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
}

function isUrl(value = '') {
  try { return /^https?:$/.test(new URL(value).protocol); }
  catch { return false; }
}

function titleCase(value = '') {
  return value.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g, (m) => m.toLocaleUpperCase('tr-TR'));
}

function normalizeModel(value = '') {
  return value.toUpperCase().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function productIdentity(input) {
  if (!isUrl(input)) {
    const cleaned = input.replace(/\s+/g, ' ').trim();
    const modelMatch = cleaned.match(/\b([A-ZÇĞİÖŞÜ]{1,8})[-\s]?([0-9]{2,6}[A-Z0-9-]*)\b/i);
    const model = modelMatch ? normalizeModel(`${modelMatch[1]}-${modelMatch[2]}`) : '';
    const category = CATEGORY_WORDS.find((word) => cleaned.toLocaleLowerCase('tr-TR').includes(word)) || '';
    const brand = cleaned.split(/\s+/)[0] || '';
    const canonical = [titleCase(brand), model, category].filter(Boolean).join(' ').trim() || cleaned;
    return { brand: titleCase(brand), model, category, title: cleaned, canonical };
  }

  try {
    const url = new URL(input);
    const parts = url.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
    const productIndex = parts.findIndex((part) => /-p-\d+/i.test(part));
    const slug = productIndex >= 0 ? parts[productIndex] : (parts[parts.length - 1] || '');
    const brandSlug = productIndex > 0 ? parts[productIndex - 1] : (parts[0] || '');
    const cleanSlug = slug.replace(/-p-\d+.*/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const brand = titleCase(brandSlug.replace(/[-_]+/g, ' '));
    const modelMatch = cleanSlug.match(/\b([A-ZÇĞİÖŞÜ]{1,8})[-\s]?([0-9]{2,6}[A-Z0-9-]*)\b/i);
    const model = modelMatch ? normalizeModel(`${modelMatch[1]}-${modelMatch[2]}`) : '';
    const lower = cleanSlug.toLocaleLowerCase('tr-TR');
    const category = CATEGORY_WORDS.find((word) => lower.includes(word)) || '';
    const title = titleCase(cleanSlug);
    const canonical = [brand, model, category].filter(Boolean).join(' ').trim() || title;
    return { brand, model, category, title, canonical };
  } catch {
    return { brand: '', model: '', category: '', title: input, canonical: input };
  }
}

function classify(input, identity) {
  const text = `${input} ${identity.canonical}`.toLocaleLowerCase('tr-TR');
  if (/trendyol|hepsiburada|amazon|n11|pttavm|pazarama|ürün|urun|fiyat|model/.test(text)) return 'product';
  if (/x\.com|twitter|instagram|tiktok|facebook|youtube/.test(text)) return 'social';
  if (/haber|gazete|son dakika|sözcü|hurriyet|milliyet|ntv|cnn|aa\.com/.test(text)) return 'news';
  return 'general';
}

function parsePrice(text = '') {
  const normalized = text.replace(/\./g, '').replace(/,/g, '.');
  const match = normalized.match(/(?:₺\s*)?(\d{2,8}(?:\.\d{1,2})?)\s*(?:TL|₺)/i)
    || normalized.match(/₺\s*(\d{2,8}(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : null;
}

function isBlocked(hostname) {
  return BLOCKED_COMPARATORS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function isDirectRetailer(hostname) {
  return DIRECT_RETAILERS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function tokenSet(value = '') {
  return new Set(value.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü-]+/g, ' ').split(/\s+/).filter((x) => x.length > 1));
}

function productMatchScore(item, identity) {
  const haystack = `${item.title || ''} ${item.snippet || ''}`.toLocaleLowerCase('tr-TR');
  let score = 0;
  if (identity.brand && haystack.includes(identity.brand.toLocaleLowerCase('tr-TR'))) score += 4;
  if (identity.model) {
    const variants = [identity.model, identity.model.replace(/-/g, ' '), identity.model.replace(/-/g, '')]
      .map((x) => x.toLocaleLowerCase('tr-TR'));
    if (variants.some((variant) => haystack.replace(/\s+/g, ' ').includes(variant))) score += 8;
  }
  if (identity.category && haystack.includes(identity.category.toLocaleLowerCase('tr-TR'))) score += 2;
  const wanted = tokenSet(identity.canonical);
  const found = tokenSet(haystack);
  for (const token of wanted) if (found.has(token)) score += 0.5;
  return score;
}

function sanitizeFreeQuery(query = '') {
  return String(query)
    .replace(/["'`()[\]{}]/g, ' ')
    .replace(/\b(?:OR|AND|NOT)\b/gi, ' ')
    .replace(/(?:site|inurl|intitle|filetype):\S+/gi, ' ')
    .replace(/[+*~^]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

async function serper(url, body, allowRetry = true) {
  const key = cleanKey();
  if (!key) throw new Error('SERPER_API_KEY eksik.');

  const safeBody = { ...body, q: sanitizeFreeQuery(body.q) };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(safeBody)
  });

  const raw = await response.text();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch {}

  if (!response.ok) {
    const message = String(payload.message || payload.error || raw.slice(0, 180));
    if (response.status === 400 && allowRetry && /query pattern not allowed/i.test(message)) {
      const simpler = sanitizeFreeQuery(safeBody.q)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 8)
        .join(' ');
      return serper(url, { ...safeBody, q: simpler, num: Math.min(Number(safeBody.num) || 10, 10) }, false);
    }
    throw new Error(`Serper ${response.status}: ${message}`);
  }

  return payload;
}

function normalize(item) {
  const link = item.link || item.productLink || '';
  const hostname = host(link);
  const text = `${item.title || ''} ${item.snippet || ''} ${item.price || ''}`;
  return {
    title: item.title || '',
    link,
    source: item.source || hostname,
    hostname,
    snippet: item.snippet || '',
    image: item.imageUrl || item.thumbnailUrl || item.thumbnail || '',
    price: item.price || '',
    priceValue: parsePrice(`${item.price || ''} ${text}`),
    rating: item.rating || null,
    ratingCount: item.ratingCount || item.reviews || null
  };
}

async function enrichAlternativeImages(alternatives) {
  return Promise.all(alternatives.slice(0, 6).map(async (item) => {
    if (item.image) return item;
    try {
      const imageQuery = sanitizeFreeQuery(item.title).split(/\s+/).slice(0, 7).join(' ');
      const payload = await serper(SERPER_IMAGES, { q: imageQuery, gl: 'tr', hl: 'tr', num: 3 });
      const first = (payload.images || []).find((image) => image.imageUrl || image.thumbnailUrl);
      return { ...item, image: first ? (first.imageUrl || first.thumbnailUrl) : '' };
    } catch {
      return item;
    }
  }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Yalnızca POST desteklenir.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const input = String(body.input || body.url || '').trim();
    if (!input) return send(res, 400, { error: 'Bir bağlantı veya arama metni girin.' });

    const identity = productIdentity(input);
    const type = classify(input, identity);
    const query = type === 'product' ? identity.canonical : (isUrl(input) ? identity.title : input);

    const productBase = [identity.brand, identity.model, identity.category].filter(Boolean).join(' ').trim();
    const searches = type === 'product'
      ? [
          `${productBase} fiyat satın al`,
          `${productBase} yorum inceleme şikayet`,
          `${identity.category || productBase} benzer alternatif ürün`
        ].map(sanitizeFreeQuery)
      : type === 'news'
        ? [query, `${query} resmi açıklama`, `${query} doğru mu`].map(sanitizeFreeQuery)
        : [query, `${query} yorum`, `${query} doğrulama`].map(sanitizeFreeQuery);

    const [pricePayload, reviewPayload, alternativePayload, imagePayload] = await Promise.all([
      serper(SERPER_SEARCH, { q: searches[0], gl: 'tr', hl: 'tr', num: 20 }),
      serper(SERPER_SEARCH, { q: searches[1], gl: 'tr', hl: 'tr', num: 12 }),
      serper(SERPER_SEARCH, { q: searches[2], gl: 'tr', hl: 'tr', num: 12 }),
      type === 'product'
        ? serper(SERPER_IMAGES, { q: sanitizeFreeQuery(productBase), gl: 'tr', hl: 'tr', num: 10 })
        : Promise.resolve({ images: [] })
    ]);

    const rawPrice = [...(pricePayload.shopping || []), ...(pricePayload.organic || [])]
      .map(normalize)
      .map((item) => ({ ...item, matchScore: productMatchScore(item, identity) }));

    const seenPrices = new Set();
    const prices = rawPrice
      .filter((item) => {
        if (!item.link || seenPrices.has(item.link) || isBlocked(item.hostname) || !isDirectRetailer(item.hostname)) return false;
        if (!Number.isFinite(item.priceValue) || item.priceValue <= 0) return false;
        if (identity.model && item.matchScore < 8) return false;
        if (!identity.model && item.matchScore < 4) return false;
        seenPrices.add(item.link);
        return true;
      })
      .sort((a, b) => a.priceValue - b.priceValue)
      .slice(0, 18);

    const reviews = [...(reviewPayload.organic || [])]
      .map(normalize)
      .map((item) => ({ ...item, matchScore: productMatchScore(item, identity) }))
      .filter((item) => item.link && !isBlocked(item.hostname) && (!identity.model || item.matchScore >= 6))
      .filter((item, index, array) => array.findIndex((other) => other.link === item.link) === index)
      .slice(0, 12);

    const exactTitleLower = `${identity.brand} ${identity.model}`.toLocaleLowerCase('tr-TR').trim();
    let alternatives = [...(alternativePayload.shopping || []), ...(alternativePayload.organic || [])]
      .map(normalize)
      .filter((item) => item.link && !isBlocked(item.hostname) && isDirectRetailer(item.hostname))
      .filter((item) => !exactTitleLower || !item.title.toLocaleLowerCase('tr-TR').includes(exactTitleLower))
      .filter((item, index, array) => array.findIndex((other) => other.link === item.link) === index)
      .slice(0, 8);

    alternatives = await enrichAlternativeImages(alternatives);

    const images = (imagePayload.images || [])
      .map((item) => ({
        image: item.imageUrl || item.thumbnailUrl || '',
        thumbnail: item.thumbnailUrl || item.imageUrl || '',
        title: item.title || query,
        source: item.source || host(item.link || ''),
        link: item.link || ''
      }))
      .filter((item) => item.image)
      .slice(0, 10);

    const sources = [...reviews, ...alternatives]
      .filter((item, index, array) => item.link && array.findIndex((other) => other.link === item.link) === index)
      .slice(0, 20);

    return send(res, 200, {
      input,
      query,
      identity,
      type,
      searchedQueries: searches,
      summary: {
        resultCount: prices.length + sources.length,
        pricedCount: prices.length,
        lowestPrice: prices[0] || null,
        highestPrice: prices.length ? prices[prices.length - 1] : null,
        averagePrice: prices.length
          ? Math.round(prices.reduce((sum, item) => sum + item.priceValue, 0) / prices.length)
          : null
      },
      prices,
      reviews,
      alternatives,
      images,
      sources,
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    return send(res, 500, { error: error.message || 'Araştırma yapılamadı.' });
  }
};