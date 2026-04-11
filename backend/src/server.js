require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const ingestRoutes = require('./routes/ingest');
const analyzeRoutes = require('./routes/analyze');
const graphRoutes = require('./routes/graph');

// Start the BullMQ queue worker
require('./queue/worker');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/ingest', ingestRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/graph', graphRoutes);

// ── Schema endpoint ───────────────────────────────────────────────
// Returns the exact CSV shape and algorithm thresholds so users
// know what to send before they hit /api/ingest
app.get('/api/schema', (_req, res) => {
  res.json({
    csv_columns: [
      { field: 'id', type: 'UUID', required: true, example: '550e8400-e29b-41d4-a716-446655440000' },
      { field: 'timestamp', type: 'ISO 8601', required: true, example: '2024-03-01T10:00:00Z' },
      { field: 'amount', type: 'number', required: true, example: 9800.00 },
      { field: 'merchant', type: 'string', required: false, example: 'Shell' },
      { field: 'category', type: 'string', required: false, example: 'fuel' },
      { field: 'account_from', type: 'string', required: true, example: 'ACC001' },
      { field: 'account_to', type: 'string', required: true, example: 'ACC002' },
    ],
    detection_thresholds: {
      structuring: { fires_when: 'amount >= (threshold - proximity) AND amount < threshold', default_threshold: 10000, default_proximity: 500 },
      rapid_succession: { fires_when: 'gap between consecutive outgoing transfers < minDeltaMs', default_minDeltaMs: 60000 },
      high_velocity: { fires_when: 'transfers from one account in windowMs > threshold', default_threshold: 10, default_windowMs: 3600000 },
      cycle: { fires_when: 'directed cycle found in transfer graph', note: 'needs at least A->B->C->A pattern' },
    },
    note: 'All four algorithms run on every ingested batch automatically.',
  });
});

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Global error handler ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 TAV API server running on port ${PORT}`);
});

module.exports = app;