const { getRedis } = require('./_redis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const password = req.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Submission ID required' });

    const kv = getRedis();
    await kv.del(`submission:${id}`);
    await kv.lrem('submissions:list', 0, id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: 'Failed to delete submission' });
  }
};
