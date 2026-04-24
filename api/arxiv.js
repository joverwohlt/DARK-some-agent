export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { names, daysBack } = req.body;

  try {
    // Search by affiliation (DARK NBI) + astro-ph, then filter by name client-side
    // This is more reliable than author name search which has matching issues
    const affiliationQuery = 'ti:DARK+AND+cat:astro-ph*';

    // Also do a parallel author-name search for each person
    const lastNames = [...new Set(names.map(n => n.split(' ').pop()))];
    const authorQuery = lastNames.map(n => `au:${n}`).join('+OR+');
    const combinedQuery = `(${authorQuery})+AND+cat:astro-ph*`;

    // Fetch both queries and merge results
    const [r1, r2] = await Promise.all([
      fetch(`https://export.arxiv.org/api/query?search_query=${combinedQuery}&start=0&max_results=200&sortBy=submittedDate&sortOrder=descending`),
      fetch(`https://export.arxiv.org/api/query?search_query=af:Jagtvej+AND+cat:astro-ph*&start=0&max_results=200&sortBy=submittedDate&sortOrder=descending`)
    ]);

    if (!r1.ok && !r2.ok) throw new Error('arXiv fetch failed');

    const text1 = r1.ok ? await r1.text() : '<feed></feed>';
    const text2 = r2.ok ? await r2.text() : '<feed></feed>';

    return res.status(200).json({ xml1: text1, xml2: text2 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
