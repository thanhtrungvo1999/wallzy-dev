const ALLOWED_IMAGE_HOSTS = new Set([
  'i.ibb.co',
  'ibb.co',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'quan-ly-tai-chinh-d0bf1.firebasestorage.app',
  'images.unsplash.com',
  'images.weserv.nl'
]);

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 3;

function isAllowedHost(hostname) {
  return ALLOWED_IMAGE_HOSTS.has(String(hostname || '').toLowerCase());
}

function getSafeFilename(name) {
  return String(name || 'wallzy-wallpaper.jpg')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 180) || 'wallzy-wallpaper.jpg';
}

function isImageContentType(contentType) {
  return /^image\/(jpeg|png|webp|avif|gif|bmp|svg\+xml)(?:\s*;|$)/i.test(contentType || '');
}

async function fetchImage(url) {
  let current = new URL(url);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!['http:', 'https:'].includes(current.protocol) || !isAllowedHost(current.hostname)) {
      throw new Error('Image host is not allowed');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(current.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Wallzy-Downloader/1.0',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location || redirects >= MAX_REDIRECTS) {
          throw new Error('Too many redirects');
        }
        current = new URL(location, current);
        continue;
      }

      if (!response.ok || !response.body) {
        throw new Error('Upstream request failed');
      }

      const contentType = response.headers.get('content-type') || '';
      if (!isImageContentType(contentType)) {
        throw new Error('Upstream response is not an image');
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_IMAGE_BYTES) {
        throw new Error('Image is too large');
      }

      return { response, contentType, controller, timer };
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  }

  throw new Error('Too many redirects');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method Not Allowed');
    return;
  }

  const rawUrl = typeof req.query?.url === 'string' ? req.query.url : '';
  const requestedName = typeof req.query?.name === 'string'
    ? req.query.name
    : 'wallzy-wallpaper.jpg';

  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    res.statusCode = 400;
    res.end('Invalid image URL');
    return;
  }

  if (!['http:', 'https:'].includes(target.protocol) || !isAllowedHost(target.hostname)) {
    res.statusCode = 403;
    res.end('Image host is not allowed');
    return;
  }

  try {
    const { response, contentType, controller, timer } = await fetchImage(target.toString());
    const safeName = getSafeFilename(requestedName);

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
    );
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800');

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength) res.setHeader('Content-Length', String(contentLength));

    const reader = response.body.getReader();
    let total = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        total += value.byteLength;
        if (total > MAX_IMAGE_BYTES) {
          await reader.cancel();
          res.statusCode = 413;
          res.end('Image is too large');
          return;
        }

        res.write(Buffer.from(value));
      }
    } finally {
      clearTimeout(timer);
      controller.abort();
      res.end();
    }
  } catch (error) {
    console.error('Wallzy download proxy error:', error);

    if (res.headersSent) {
      res.end();
      return;
    }

    if (error?.name === 'AbortError') {
      res.statusCode = 504;
      res.end('Image request timed out');
      return;
    }

    if (error?.message === 'Image host is not allowed') {
      res.statusCode = 403;
      res.end('Image host is not allowed');
      return;
    }

    if (error?.message === 'Image is too large') {
      res.statusCode = 413;
      res.end('Image is too large');
      return;
    }

    if (error?.message === 'Upstream response is not an image') {
      res.statusCode = 415;
      res.end('Upstream response is not an image');
      return;
    }

    res.statusCode = 502;
    res.end('Download failed');
  }
}
