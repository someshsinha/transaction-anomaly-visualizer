const { Pool } = require('pg');

// Priority 1: Check process.env directly (Render injection)
// Priority 2: Try to load from .env file
require('dotenv').config();

const pgUri = process.env.PG_URI || process.env.DATABASE_URL;

if (pgUri) {
  console.log('✅ Postgres: Detected connection string');
} else {
  console.warn('⚠️  Postgres: No connection string found. Defaulting to localhost:5432');
}

const poolOptions = {
  connectionString: pgUri,
};

// Only enable SSL if we are connecting to a remote host (Neon/Render)
if (pgUri && (pgUri.includes('neon.tech') || pgUri.includes('render.com') || pgUri.includes('aws.com'))) {
  poolOptions.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolOptions);

// Verification logic for your terminal
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;