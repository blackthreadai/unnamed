const Redis = require('ioredis');

let redis;
function getRedis() {
  if (!redis) redis = new Redis(process.env.REDIS_URL, { tls: { rejectUnauthorized: false } });
  return redis;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const password = req.headers['x-admin-password'] || req.query.password;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const kv = getRedis();
    const ids = await kv.lrange('submissions:list', 0, -1);

    if (!ids || ids.length === 0) {
      return res.status(200).json({ submissions: [] });
    }

    const submissions = await Promise.all(
      ids.map(async (id) => {
        const data = await kv.hgetall(`submission:${id}`);
        return data && Object.keys(data).length > 0 ? data : null;
      })
    );

    const valid = submissions
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ submissions: valid });
  } catch (err) {
    console.error('Submissions fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};
