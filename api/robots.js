export default function handler(req, res) {
  const origin = `https://${req.headers.host || 'wallzy-gold.vercel.app'}`;
  const body = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(body);
}
