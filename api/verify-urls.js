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
        const response = await fetch(url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'DARK-SoMe-Agent/1.0' },
          signal: AbortSignal.timeout(5000)
        });
        results[url] = response.ok;
      } catch {
        results[url] = false;
      }
    })
  );

  return res.status(200).json({ results });
}
