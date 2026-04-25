export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { daysBack } = req.body;

  try {
    // PRIMARY STRATEGY: Search by NBI/DARK affiliation keywords
    // af: field searches affiliation strings embedded in the paper metadata
    const affilQueries = [
      'af:Jagtvej+AND+cat:astro-ph*',
      'af:%22Niels+Bohr+Institute%22+AND+cat:astro-ph*',
      'af:DARK+AND+af:Copenhagen+AND+cat:astro-ph*'
    ];

    const results = await Promise.allSettled(
      affilQueries.map(q =>
        fetch(`https://export.arxiv.org/api/query?search_query=${q}&start=0&max_results=200&sortBy=submittedDate&sortOrder=descending`)
          .then(r => r.ok ? r.text() : '<feed></feed>')
          .catch(() => '<feed></feed>')
      )
    );

    const xmlResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    if (xmlResults.every(x => x === '<feed></feed>')) {
      throw new Error('arXiv affiliation search returned no results');
    }

    return res.status(200).json({ xmlResults });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
