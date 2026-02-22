const { Redis } = require('@upstash/redis');

let redis;

function getRedis() {
  if (!redis) {
    // Support both Upstash REST env vars and REDIS_URL
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      redis = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
    } else if (process.env.REDIS_URL) {
      // Parse rediss:// URL — extract host for REST URL, use as token fallback
      // Upstash REST URL is https://<host>, token is the password
      const parsed = new URL(process.env.REDIS_URL);
      redis = new Redis({
        url: `https://${parsed.hostname}`,
        token: parsed.password,
      });
    } else {
      throw new Error('No Redis configuration found. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or REDIS_URL');
    }
  }
  return redis;
}

module.exports = { getRedis };
