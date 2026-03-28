// src/services/ingestService.js
const { parse }        = require('csv-parse/sync');   // sync parse for simplicity
const { Queue }        = require('bullmq');
const { redisConfig }  = require('../config/redis');
const pool             = require('../db/postgres');
const neo4jDriver      = require('../db/neo4j');

const analysisQueue = new Queue('tav-analysis', { connection: redisConfig });

// ── Shared helper: rows → { nodes, edges } ────────────────────────
// Mirrors the logic in producer.js but lives here so the API owns it
const rowsToSubgraph = (rows) => {
  const nodeSet = new Set();
  const edges   = [];

  rows.forEach(row => {
    nodeSet.add(row.account_from);
    nodeSet.add(row.account_to);
    edges.push({
      id:        row.id,
      from:      row.account_from,
      to:        row.account_to,
      amount:    parseFloat(row.amount),
      timestamp: row.timestamp instanceof Date
        ? row.timestamp.toISOString()
        : row.timestamp,
      merchant:  row.merchant  || null,
      category:  row.category  || null,
    });
  });

  return { nodes: [...nodeSet].map(id => ({ id })), edges };
};

// ── Parse incoming data into a normalised row array ───────────────
const parseInput = (body, csvString) => {
  // JSON path: body.transactions = [{ id, timestamp, amount, ... }]
  if (body.transactions && Array.isArray(body.transactions)) {
    return body.transactions;
  }

  // CSV path: raw CSV string passed in (from multer buffer or raw body)
  if (csvString) {
    return parse(csvString, { columns: true, cast: true, skip_empty_lines: true });
  }

  throw new Error('No valid input: provide body.transactions (JSON array) or a CSV file');
};

// ── Bulk-insert rows into PostgreSQL ──────────────────────────────
const insertRows = async (rows) => {
  if (rows.length === 0) return;

  const CHUNK_SIZE = 1000;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    
    const values = [];
    const placeholders = chunk.map((row, idx) => {
      const b = idx * 7;
      values.push(
        row.id,
        row.timestamp,
        parseFloat(row.amount),
        row.merchant || null,
        row.category || null,
        row.account_from,
        row.account_to
      );
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7})`;
    });

    const query = `
      INSERT INTO transactions (id, timestamp, amount, merchant, category, account_from, account_to)
      VALUES ${placeholders.join(',')}
      ON CONFLICT (id) DO NOTHING
    `;

    await pool.query(query, values);
  }
};

// ── Bulk-insert rows into Neo4j ───────────────────────────────────
const insertIntoNeo4j = async (rows) => {
  if (rows.length === 0) return;
  const session = neo4jDriver.session();
  
  try {
    const CHUNK_SIZE = 2000;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const sanitizedRows = chunk.map(row => ({
        ...row,
        timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
        amount: parseFloat(row.amount)
      }));

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
      await session.run(cypher, { batches: sanitizedRows });
    }
  } finally {
    await session.close();
  }
};

// ── Main service function ─────────────────────────────────────────
/**
 * @param {Object} body       — Express req.body
 * @param {Buffer|null} file  — multer file buffer (CSV upload), or null
 * @returns {{ jobId: string, rowCount: number, enqueuedBatches: number }}
 */
const ingestAndEnqueue = async (body, file = null) => {
  const csvString = file ? file.buffer.toString('utf8') : null;
  const rows      = parseInput(body, csvString);

  if (rows.length === 0) throw new Error('Input contains 0 transactions');

  // 1. Persist to PostgreSQL and Neo4j
  await insertRows(rows);
  await insertIntoNeo4j(rows);

  // 2. Split into batches of 500 and enqueue each
  const BATCH_SIZE   = 500;
  const timestamp    = Date.now();
  let   batchNum     = 0;
  const jobIds       = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch    = rows.slice(i, i + BATCH_SIZE);
    const subgraph = rowsToSubgraph(batch);
    const batchId  = `batch-${timestamp}-${batchNum}`;

    await analysisQueue.add(
      'analyze-subgraph',
      { batchId, ...subgraph },
      {
        attempts:         3,
        backoff:          { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail:     false,
      }
    );

    jobIds.push(batchId);
    batchNum++;
  }

  // Return the first batchId as the "jobId" for simple polling,
  // plus the full list for multi-batch ingests
  return {
    jobId:           jobIds[0],
    allJobIds:       jobIds,
    rowCount:        rows.length,
    enqueuedBatches: batchNum,
  };
};

module.exports = { ingestAndEnqueue };