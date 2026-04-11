// src/config/redis.js
// Centralised Redis connection config for BullMQ.

require('dotenv').config();

// Use REDIS_URL if available (preferred for managed services like Upstash)
// Otherwise fallback to host/port
const redisConfig = process.env.REDIS_URL 
  ? process.env.REDIS_URL
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    };

module.exports = { redisConfig };