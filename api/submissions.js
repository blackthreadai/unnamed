const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple password auth via query param or header
  const password = req.headers['x-admin-password'] || req.query.password;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all submission IDs
    const ids = await kv.lrange('submissions:list', 0, -1);

    if (!ids || ids.length === 0) {
      return res.status(200).json({ submissions: [] });
    }

    // Fetch each submission
    const submissions = await Promise.all(
      ids.map(async (id) => {
        const data = await kv.hgetall(`submission:${id}`);
        return data;
      })
    );

    // Filter nulls and sort by date (newest first)
    const valid = submissions
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ submissions: valid });
  } catch (err) {
    console.error('Submissions fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};
