export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { names, daysBack } = req.body;

  try {
    // Strategy: run multiple queries and merge results
    // 1. Affiliation-based: catches papers where NBI affiliation is in metadata
    // 2. Author last-name based: catches papers where affiliation metadata is missing
    const lastNames = [...new Set((names || []).map(n => n.split(' ').pop()))];
    const authorQuery = lastNames.map(n => `au:${n}`).join('+OR+');

    const queries = [
      // Affiliation searches
      `af:Jagtvej+AND+cat:astro-ph*`,
      `af:%22Niels+Bohr+Institute%22+AND+cat:astro-ph*`,
      `af:DARK+AND+af:Copenhagen+AND+cat:astro-ph*`,
      // Author name search as fallback — catches papers with missing affiliation metadata
      `(${authorQuery})+AND+cat:astro-ph*`,
    ];

    const results = await Promise.allSettled(
      queries.map(q =>
        fetch(`https://export.arxiv.org/api/query?search_query=${q}&start=0&max_results=200&sortBy=submittedDate&sortOrder=descending`)
          .then(r => r.ok ? r.text() : '<feed></feed>')
          .catch(() => '<feed></feed>')
      )
    );

    const xmlResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    return res.status(200).json({ xmlResults });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
