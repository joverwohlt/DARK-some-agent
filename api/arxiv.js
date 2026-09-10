export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { names, daysBack } = req.body;

  try {
    const lastNames = [...new Set((names || []).map(n => n.split(' ').pop()))];
    const authorQuery = lastNames.map(n => `au:${n}`).join('+OR+');

    // Build date filter string for arXiv API (submittedDate:[from TO now])
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (daysBack || 30));
    const fromStr = fromDate.toISOString().split('T')[0].replace(/-/g, '');
    const dateFilter = `+AND+submittedDate:[${fromStr}0000+TO+99991231235959]`;

    const queries = [
      // Affiliation-based — most reliable for DARK papers
      `af:Jagtvej+AND+cat:astro-ph*${dateFilter}`,
      `af:%22Niels+Bohr+Institute%22+AND+cat:astro-ph*${dateFilter}`,
      `af:DARK+AND+af:Copenhagen+AND+cat:astro-ph*${dateFilter}`,
      // Author name fallback — use with date filter to keep results manageable
      `(${authorQuery})+AND+cat:astro-ph*${dateFilter}`,
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

    const counts = xmlResults.map(xml => (xml.match(/<entry>/g) || []).length);

    return res.status(200).json({ xmlResults, debug: { counts, queries, fromStr } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
