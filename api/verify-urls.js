export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: 'Missing urls array' });

  const results = {};

  await Promise.allSettled(
    urls.filter(u => u && u.startsWith('http')).map(async url => {
      try {
        // Try GET first (some servers reject HEAD) — read only a small chunk
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'DARK-SoMe-Agent/1.0 (contact: jo.verwohlt@nbi.ku.dk)',
            'Range': 'bytes=0-1023' // Only download first 1KB to verify existence
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        // Check content type is an image
        const contentType = response.headers.get('content-type') || '';
        const isImage = contentType.startsWith('image/') ||
                        url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i);

        results[url] = response.ok && (isImage || response.status === 206);
      } catch {
        results[url] = false;
      }
    })
  );

  return res.status(200).json({ results });
}
