// src/config/redis.js
require('dotenv').config();
const { URL } = require('url');

const redisUrl = process.env.REDIS_URL;
let redisConfig;

if (redisUrl) {
  console.log('✅ Redis: Parsing REDIS_URL for BullMQ');
  try {
    const parsed = new URL(redisUrl);
    redisConfig = {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      // Upstash (rediss://) requires TLS. 
      // This enables TLS if the protocol is rediss:
      tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
    };
  } catch (err) {
    console.error('❌ Redis: Failed to parse REDIS_URL:', err.message);
    process.exit(1);
  }
} else {
  console.warn('⚠️  Redis: REDIS_URL not found, using localhost fallback');
  redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
  };
}

module.exports = { redisConfig };