const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const pool = require('./postgres');

// Updated path: go up two levels from src/db to root, then into scripts/
const csvFilePath = path.join(__dirname, '../../scripts/sample.csv');

async function ingestData() {
  // Check if file exists before starting to avoid confusing errors
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Error: Cannot find sample.csv at ${csvFilePath}`);
    process.exit(1);
  }

  const parser = fs.createReadStream(csvFilePath).pipe(
    parse({ columns: true, cast: true })
  );

  console.log('🚀 Starting ingestion into PostgreSQL...');
  let count = 0;

  for await (const record of parser) {
    const query = `
      INSERT INTO transactions (id, timestamp, amount, merchant, category, account_from, account_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING;
    `;
    
    const values = [
      record.id,
      record.timestamp,
      record.amount,
      record.merchant,
      record.category,
      record.account_from,
      record.account_to
    ];

    await pool.query(query, values);
    count++;
    if (count % 1000 === 0) console.log(`Processed ${count} rows...`);
  }

  console.log('✅ Ingestion complete!');
  process.exit(0);
}

ingestData().catch(console.error);