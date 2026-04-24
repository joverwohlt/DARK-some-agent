export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { names, daysBack } = req.body;

  try {
    // Search each person individually using last name + first initial for precision
    const authorVariants = names.map(n => {
      const parts = n.trim().split(' ');
      const last = parts[parts.length - 1];
      const first = parts[0];
      // Use "last_first" format arXiv supports
      return `au:${last}_${first.charAt(0)}`;
    });

    const authorQuery = [...new Set(authorVariants)].join('+OR+');
    const query = `(${authorQuery})+AND+cat:astro-ph*`;
    const url = `https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=200&sortBy=submittedDate&sortOrder=descending`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('arXiv fetch failed');

    const text = await response.text();
    return res.status(200).json({ xml: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
