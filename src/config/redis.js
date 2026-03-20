// src/config/redis.js
// Centralised Redis connection config for BullMQ.
// BullMQ needs { host, port } — it does NOT accept a connection string URI.

require('dotenv').config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

module.exports = { redisConfig };