const { Pool } = require('pg');
require('dotenv').config();

// Create a pool instance using the URI from your .env
const pool = new Pool({
  connectionString: process.env.PG_URI,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

// Verification logic for your terminal
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;