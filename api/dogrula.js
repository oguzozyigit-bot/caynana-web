const SERPER_URL = 'https://google.serper.dev/search';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function isUrl(value='') {
  try { const u = new URL(value); return /^https?:$/.test(u.protocol); } catch { return false; }
}

function titleFromUrl(raw='') {
  try {
    const u = new URL(raw);
    const parts = u.pathname.split('/').filter(Boolean);
    let slug = parts.find(x => /-p-\d+/.test(x)) || parts[parts.length - 1] || '';
    slug = slug.replace(/-p-\d+.*/, '').replace(/[-_]+/g, ' ');
    return decodeURIComponent(slug).replace(/\b\w/g, c => c.toUpperCase()).trim();
  } catch { return raw; }
}

function classify(input, query) {
  const text = `${input} ${query}`.toLowerCase();
  if (/trendyol|hepsiburada|n11|amazon|pazarama|pttavm|teknosa|mediamarkt|koçtaş|urun|ürün|fiyat|model/.test(text)) return 'product';
  if (/x\.com|twitter|instagram|tiktok|facebook|youtube/.test(text)) return 'social';
  if (/haber|gazete|son dakika|belediye|bakan|başkan|sözcü|hurriyet|milliyet|ntv|cnn|aa\.com/.test(text)) return 'news';
  return 'general';
}

function parsePrice(text='') {
  const normalized = text.replace(/\./g, '').replace(/,/g, '.');
  const m = normalized.match(/(?:₺|TL\s*)?(\d{2,7}(?:\.\d{1,2})?)\s*(?:TL|₺)/i) || normalized.match(/(?:₺)\s*(\d{2,7}(?:\.\d{1,2})?)/i);
  return m ? Number(m[1]) : null;
}

function hostname(link='') {
  try { return new URL(link).hostname.replace(/^www\./, ''); } catch { return ''; }
}

async function serperSearch(q, num=10) {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error('SERPER_API_KEY eksik.');
  const r = await fetch(SERPER_URL, {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, gl: 'tr', hl: 'tr', num })
  });
  if (!r.ok) throw new Error(`Serper ${r.status} yanıtı verdi.`);
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Yalnızca POST desteklenir.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const input = String(body.input || body.url || '').trim();
    if (!input) return json(res, 400, { error: 'Bir bağlantı veya arama metni girin.' });

    const query = isUrl(input) ? titleFromUrl(input) : input;
    const type = classify(input, query);
    const searches = type === 'product'
      ? [`${query} fiyat`, `${query} yorum`, `${query} inceleme şikayet`]
      : type === 'news'
        ? [`${query}`, `${query} resmi açıklama`, `${query} doğru mu`]
        : [`${query}`, `${query} yorum`, `${query} doğrulama`];

    const payloads = await Promise.all(searches.map(q => serperSearch(q, 10)));
    const seen = new Set();
    const results = [];
    for (const payload of payloads) {
      for (const item of [...(payload.shopping || []), ...(payload.organic || [])]) {
        const link = item.link || item.productLink || '';
        const key = link || `${item.title}|${item.price}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const text = `${item.title || ''} ${item.snippet || ''} ${item.price || ''}`;
        results.push({
          title: item.title || '',
          link,
          source: item.source || hostname(link),
          snippet: item.snippet || '',
          image: item.imageUrl || item.thumbnail || '',
          price: item.price || '',
          priceValue: parsePrice(`${item.price || ''} ${text}`),
          rating: item.rating || null,
          ratingCount: item.ratingCount || item.reviews || null,
          position: item.position || null
        });
      }
    }

    const priced = results.filter(x => Number.isFinite(x.priceValue) && x.priceValue > 0).sort((a,b) => a.priceValue - b.priceValue);
    const reviewResults = results.filter(x => /yorum|inceleme|şikayet|değerlendirme/i.test(`${x.title} ${x.snippet}`)).slice(0, 8);
    const newsResults = results.filter(x => !Number.isFinite(x.priceValue)).slice(0, 12);

    return json(res, 200, {
      input,
      query,
      type,
      searchedQueries: searches,
      summary: {
        resultCount: results.length,
        pricedCount: priced.length,
        lowestPrice: priced[0] || null,
        highestPrice: priced.length ? priced[priced.length - 1] : null,
        averagePrice: priced.length ? Math.round(priced.reduce((s,x)=>s+x.priceValue,0)/priced.length) : null
      },
      prices: priced.slice(0, 12),
      reviews: reviewResults,
      sources: newsResults,
      allResults: results.slice(0, 24),
      analyzedAt: new Date().toISOString()
    });
  } catch (e) {
    return json(res, 500, { error: e.message || 'Araştırma yapılamadı.' });
  }
};
