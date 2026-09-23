const PROJECT_ID = 'quan-ly-tai-chinh-d0bf1';
const COLLECTION_PATH = 'artifacts/public/uploaded_images_v3';

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function typedValue(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('referenceValue' in v) return v.referenceValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(typedValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, typedValue(x)]));
  return undefined;
}

function slugify(value) {
  return String(value || 'wallpaper')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'wallpaper';
}

function wallpaperPath(doc) {
  const f = doc.fields || {};
  const data = Object.fromEntries(Object.entries(f).map(([k,v]) => [k, typedValue(v)]));
  const name = data.title || data.name || data.category || 'wallpaper';
  const id = data.id || (doc.name || '').split('/').pop();
  return `/wallpaper/${slugify(name)}-${encodeURIComponent(String(id))}`;
}

export default async function handler(req, res) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION_PATH}`;
  let docs = [];
  try {
    const r = await fetch(base);
    if (r.ok) {
      const data = await r.json();
      docs = Array.isArray(data.documents) ? data.documents : [];
    }
  } catch (e) {}

  const origin = `https://${req.headers.host || 'wallzy-gold.vercel.app'}`;
  const categories = new Set();
  const urls = [{ loc: `${origin}/` }];
  for (const doc of docs) {
    const f = doc.fields || {};
    const raw = Object.fromEntries(Object.entries(f).map(([k,v]) => [k, typedValue(v)]));
    if (raw.category) categories.add(String(raw.category).trim());
    if (raw.url || raw.id || doc.name) {
      const lastmod = raw.timestamp ? new Date(raw.timestamp).toISOString() : null;
      urls.push({ loc: `${origin}${wallpaperPath(doc)}`, lastmod });
    }
  }

  for (const category of categories) {
    const slug = slugify(category);
    if (slug !== 'all') urls.push({ loc: `${origin}/category/${encodeURIComponent(slug)}` });
  }

  const unique = [...new Map(urls.map(item => [item.loc, item])).values()];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique.map(({ loc, lastmod }) => `  <url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(body);
}
