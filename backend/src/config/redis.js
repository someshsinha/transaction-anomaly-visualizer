// src/config/redis.js
require('dotenv').config();

const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  console.log('✅ Redis: Using REDIS_URL from environment');
} else {
  console.warn('⚠️  Redis: REDIS_URL not found, falling back to localhost:6379');
}

const redisConfig = redisUrl 
  ? redisUrl
  : {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    };

module.exports = { redisConfig };