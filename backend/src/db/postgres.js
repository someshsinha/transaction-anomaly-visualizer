const { Pool } = require('pg');
require('dotenv').config();

const pgUri = process.env.PG_URI;

if (pgUri) {
  console.log('✅ Postgres: PG_URI detected');
} else {
  console.warn('⚠️  Postgres: PG_URI is missing, falling back to localhost:5432');
}

// Create a pool instance using the URI from your .env
const poolOptions = {
  connectionString: pgUri,
};

if (pgUri) {
  poolOptions.ssl = {
    rejectUnauthorized: false, // Required for Neon
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