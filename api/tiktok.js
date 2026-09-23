const ALLOWED_TIKTOK_HOSTS = new Set([
    'www.tiktok.com',
    'tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com'
]);

const TIKWM_API = 'https://tikwm.com/api/';
const TIMEOUT_MS = 12000;

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const rawUrl = String(req.query?.url || '').trim();
    if (!rawUrl) return res.status(400).json({ error: 'Missing TikTok URL.' });

    let target;
    try {
        target = new URL(rawUrl);
    } catch {
        return res.status(400).json({ error: 'Invalid TikTok URL.' });
    }

    const host = target.hostname.toLowerCase();
    if (!ALLOWED_TIKTOK_HOSTS.has(host)) {
        return res.status(400).json({ error: 'Only TikTok URLs are supported.' });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const apiUrl = TIKWM_API + '?url=' + encodeURIComponent(target.href);
        const response = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Wallzy/1.0'
            }
        });

        if (!response.ok) {
            return res.status(502).json({ error: 'TikTok extraction service is unavailable.' });
        }

        const data = await response.json();
        if (data.code !== 0 || !data.data) {
            return res.status(422).json({ error: data.msg || 'Unable to extract this TikTok post.' });
        }

        const images = Array.isArray(data.data.images)
            ? data.data.images.filter(item => typeof item === 'string' && /^https?:\/\//i.test(item))
            : [];

        return res.status(200).json({
            images,
            isVideo: !images.length && Boolean(data.data.play)
        });
    } catch (error) {
        console.error('[Wallzy] TikTok proxy error:', error);
        return res.status(504).json({ error: 'TikTok extraction timed out.' });
    } finally {
        clearTimeout(timer);
    }
}
