// src/queue/producer.js
// Reads a batch of raw transactions from PostgreSQL, shapes them into
// a { nodes, edges } subgraph, and pushes the job onto the BullMQ queue.

const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');
const pool = require('../db/postgres');

const analysisQueue = new Queue('tav-analysis', { connection: redisConfig });

/**
 * Converts flat Postgres transaction rows into a graph representation
 * that the algorithm suite expects.
 *
 * @param {Array} rows  — rows from the transactions table
 * @returns {{ nodes: Array, edges: Array }}
 */
const rowsToSubgraph = (rows) => {
  const nodeSet = new Set();
  const edges = [];

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
      merchant:  row.merchant,
    });
  });

  const nodes = [...nodeSet].map(id => ({ id }));
  return { nodes, edges };
};

/**
 * Fetches all unprocessed transactions in batches and enqueues each batch.
 *
 * @param {number} batchSize  — rows per job (default 500)
 */
const enqueueAllTransactions = async (batchSize = 500) => {
  try {
    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY timestamp ASC');
    console.log(`📦 Fetched ${rows.length} transactions from PostgreSQL`);

    let batchNum = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const subgraph = rowsToSubgraph(batch);
      const batchId = `batch-${Date.now()}-${batchNum}`;

      await analysisQueue.add(
        'analyze-subgraph',
        { batchId, ...subgraph },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      console.log(`✅ Enqueued ${batchId} (${batch.length} transactions)`);
      batchNum++;
    }

    console.log(`🚀 All ${batchNum} batches enqueued.`);
  } catch (err) {
    console.error('❌ Producer error:', err);
  } finally {
    await analysisQueue.close();
    await pool.end();
  }
};

// Run directly: node src/queue/producer.js
enqueueAllTransactions();