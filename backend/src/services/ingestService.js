// src/services/ingestService.js
const { parse }        = require('csv-parse/sync');
const { Queue }        = require('bullmq');
const { redisConfig }  = require('../config/redis');
const pool             = require('../db/postgres');
const neo4jDriver      = require('../db/neo4j');

const analysisQueue = new Queue('tav-analysis', { connection: redisConfig });

// ── Required CSV/JSON fields ──────────────────────────────────────
const REQUIRED_FIELDS = ['id', 'timestamp', 'amount', 'account_from', 'account_to'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates a single transaction row.
 * Returns an array of error strings (empty = valid).
 */
const validateRow = (row, index) => {
  const errors = [];

  REQUIRED_FIELDS.forEach(field => {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      errors.push(`Row ${index + 1}: missing required field "${field}"`);
    }
  });

  if (row.id && !UUID_REGEX.test(String(row.id))) {
    errors.push(
      `Row ${index + 1}: "id" must be a valid UUID (got "${row.id}"). ` +
      `Use a UUID generator or set id to something like "550e8400-e29b-41d4-a716-446655440000".`
    );
  }

  if (row.amount !== undefined && isNaN(parseFloat(row.amount))) {
    errors.push(`Row ${index + 1}: "amount" must be a number (got "${row.amount}")`);
  }

  if (row.timestamp !== undefined && isNaN(Date.parse(row.timestamp))) {
    errors.push(`Row ${index + 1}: "timestamp" must be ISO 8601 (got "${row.timestamp}")`);
  }

  return errors;
};

/**
 * Validates all rows. Throws a descriptive error on the first batch of failures.
 * Checks up to 10 rows to give the user a useful summary without flooding them.
 */
const validateRows = (rows) => {
  const allErrors = [];
  for (let i = 0; i < rows.length; i++) {
    const errs = validateRow(rows[i], i);
    allErrors.push(...errs);
    if (allErrors.length >= 10) break;
  }
  if (allErrors.length > 0) {
    throw new Error(
      `Validation failed:\n${allErrors.join('\n')}\n\n` +
      `Expected CSV columns: id (UUID), timestamp (ISO 8601), amount (number), ` +
      `merchant (optional), category (optional), account_from (string), account_to (string)`
    );
  }
};

// ── Shared helper: rows → { nodes, edges } ────────────────────────
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
  if (body.transactions && Array.isArray(body.transactions)) {
    return body.transactions;
  }
  if (csvString) {
    return parse(csvString, { columns: true, cast: true, skip_empty_lines: true });
  }
  throw new Error(
    'No valid input. Provide either:\n' +
    '  JSON body: { "transactions": [ { id, timestamp, amount, merchant, category, account_from, account_to }, ... ] }\n' +
    '  Multipart form: "file" field with a CSV using those same column headers'
  );
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
    await pool.query(
      `INSERT INTO transactions (id, timestamp, amount, merchant, category, account_from, account_to)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (id) DO NOTHING`,
      values
    );
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
      await session.run(
        `UNWIND $batches AS row
         MERGE (from:Account {id: row.account_from})
         MERGE (to:Account {id: row.account_to})
         MERGE (from)-[r:TRANSFER {id: row.id}]->(to)
         SET r.amount = row.amount,
             r.timestamp = row.timestamp,
             r.merchant = row.merchant`,
        { batches: sanitizedRows }
      );
    }
  } finally {
    await session.close();
  }
};

// ── Main service function ─────────────────────────────────────────
const ingestAndEnqueue = async (body, file = null) => {
  const ingestStart = Date.now();
  const csvString = file ? file.buffer.toString('utf8') : null;
  const rows      = parseInput(body, csvString);

  if (rows.length === 0) throw new Error('Input contains 0 transactions');

  // Validate before touching any DB
  validateRows(rows);

  await Promise.all([
    insertRows(rows),
    insertIntoNeo4j(rows)
  ]);

  const BATCH_SIZE = 500;
  let   batchNum   = 0;
  const jobIds     = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch    = rows.slice(i, i + BATCH_SIZE);
    const subgraph = rowsToSubgraph(batch);
    const batchId  = `batch-${ingestStart}-${batchNum}`;

    await analysisQueue.add(
      'analyze-subgraph',
      { 
        batchId, 
        ingestStart, 
        totalRows: rows.length,
        isLastBatch: (i + BATCH_SIZE >= rows.length),
        ...subgraph 
      },
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

  return {
    jobId:           jobIds[0],
    allJobIds:       jobIds,
    rowCount:        rows.length,
    enqueuedBatches: batchNum,
    ingestStart,
    ingestLatency:   Date.now() - ingestStart
  };
};

module.exports = { ingestAndEnqueue };