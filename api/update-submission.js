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
    const { id, email, idea, status } = req.body;
    if (!id) return res.status(400).json({ error: 'Submission ID required' });

    const kv = getRedis();
    const existing = await kv.hgetall(`submission:${id}`);
    if (!existing || Object.keys(existing).length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const updates = {};
    if (email !== undefined) updates.email = email;
    if (idea !== undefined) updates.idea = idea;
    if (status !== undefined) updates.status = status;

    await kv.hset(`submission:${id}`, updates);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Update error:', err);
    return res.status(500).json({ error: 'Failed to update submission' });
  }
};
