export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { names, daysBack } = req.body;

  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (daysBack || 30));
    const fromStr = fromDate.toISOString().split('T')[0].replace(/-/g, '');
    // URL-encode the brackets — arXiv requires this
    const dateFilter = `+AND+submittedDate:%5B${fromStr}0000+TO+99991231235959%5D`;

    const lastNames = [...new Set((names || []).map(n => n.split(' ').pop()))];

    // One query per last name with date filter — reliable and precise
    const queries = lastNames.map(lastName =>
      `au:${lastName}+AND+cat:astro-ph*${dateFilter}`
    );

    const results = await Promise.allSettled(
      queries.map(q =>
        fetch(`https://export.arxiv.org/api/query?search_query=${q}&start=0&max_results=50&sortBy=submittedDate&sortOrder=descending`)
          .then(r => r.ok ? r.text() : '<feed></feed>')
          .catch(() => '<feed></feed>')
      )
    );

    const xmlResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const counts = xmlResults.map(xml => (xml.match(/<entry>/g) || []).length);

    return res.status(200).json({ xmlResults, debug: { counts, lastNames, fromStr } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
