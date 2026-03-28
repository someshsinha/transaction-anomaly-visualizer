// src/server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const multer  = require('multer');

const ingestRoutes  = require('./routes/ingest');
const analyzeRoutes = require('./routes/analyze');
const graphRoutes   = require('./routes/graph');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));   // for large JSON payloads
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/ingest',   ingestRoutes);
app.use('/api/analyze',  analyzeRoutes);
app.use('/api/graph',    graphRoutes);

// ── Health check ─────────────────────────────────────────────────
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