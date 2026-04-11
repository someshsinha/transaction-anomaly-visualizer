const pgPool = require('./postgres');
const neo4jDriver = require('./neo4j');

async function migrate() {
  console.log('🔗 Starting Migration: Postgres ➔ Neo4j');
  
  try {
    // 1. Get raw data from Postgres
    const { rows } = await pgPool.query('SELECT * FROM transactions');
    console.log(`📦 Fetched ${rows.length} transactions from Postgres`);

    // 2. SANITIZE DATA: This is the "Fix" for the Map{} error
    // We convert Date objects to Strings and ensure numbers are Floats
    const sanitizedRows = rows.map(row => ({
      ...row,
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
      amount: parseFloat(row.amount)
    }));

    const session = neo4jDriver.session();

    // 3. The Cypher Query
    const cypher = `
      UNWIND $batches AS row
      MERGE (from:Account {id: row.account_from})
      MERGE (to:Account {id: row.account_to})
      CREATE (from)-[:TRANSFER {
        id: row.id,
        amount: row.amount,
        timestamp: row.timestamp,
        merchant: row.merchant
      }]->(to)
    `;

    console.log('🚀 Sending batches to Neo4j...');
    await session.run(cypher, { batches: sanitizedRows });
    
    await session.close();
    console.log('✅ Graph Migration Complete!');

  } catch (err) {
    console.error('❌ Migration Error:', err);
  } finally {
    // Explicitly close everything so the terminal returns to prompt
    await neo4jDriver.close();
    await pgPool.end();
  }
}

migrate();