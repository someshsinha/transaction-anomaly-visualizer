// src/queue/worker.js
// BullMQ worker: consumes jobs from the analysis queue, runs all 4 detection
// algorithms, and writes any discovered anomalies back to PostgreSQL.

const { Worker } = require('bullmq');
const { redisConfig } = require('../config/redis');
const { runDetectionSuite } = require('../algorithms/index');
const pool = require('../db/postgres');

/**
 * Inserts a batch of anomalies into the anomalies table.
 * Each anomaly is stored as a JSONB row for flexible querying from the dashboard.
 */
const persistAnomalies = async (batchId, anomalies) => {
  if (anomalies.length === 0) return;

  // Build a multi-row INSERT for efficiency
  const values = [];
  const placeholders = anomalies.map((anomaly, i) => {
    const base = i * 3;
    values.push(batchId, anomaly.type, JSON.stringify(anomaly));
    return `($${base + 1}, $${base + 2}, $${base + 3}, NOW())`;
  });

  const query = `
    INSERT INTO anomalies (batch_id, anomaly_type, details, detected_at)
    VALUES ${placeholders.join(', ')}
  `;

  await pool.query(query, values);
};

const worker = new Worker(
  'tav-analysis',
  async (job) => {
    const { batchId, nodes, edges } = job.data;
    console.log(`⚙️  Processing ${batchId} — ${nodes.length} nodes, ${edges.length} edges`);

    const anomalies = runDetectionSuite(nodes, edges);

    if (anomalies.length > 0) {
      await persistAnomalies(batchId, anomalies);
      console.log(`🚨 ${batchId}: ${anomalies.length} anomalies written to PostgreSQL`);
    } else {
      console.log(`✅ ${batchId}: clean — no anomalies`);
    }

    return { batchId, anomalyCount: anomalies.length };
  },
  { connection: redisConfig, concurrency: 4 }
);

// Worker lifecycle events
worker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed — ${result.anomalyCount} anomalies found`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

console.log('👷 TAV worker is running. Waiting for jobs...');