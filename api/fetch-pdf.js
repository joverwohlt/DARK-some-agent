export const config = {
  api: {
    responseLimit: '10mb',
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { arxivId } = req.body;
  if (!arxivId) return res.status(400).json({ error: 'Missing arxivId' });

  try {
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}`;
    const response = await fetch(pdfUrl, {
      headers: { 'User-Agent': 'DARK-SoMe-Agent/1.0 (contact jo.verwohlt@nbi.ku.dk)' },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) throw new Error(`PDF fetch failed: ${response.status}`);

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Warn client if PDF is very large
    const sizeKB = Math.round(base64.length / 1024);
    return res.status(200).json({ base64, sizeKB });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
