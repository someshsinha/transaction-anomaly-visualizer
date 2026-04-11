// src/routes/ingest.js
const express = require('express');
const multer  = require('multer');
const { ingestAndEnqueue } = require('../services/ingestService');

const router  = express.Router();
// store in memory — no disk I/O, files are transient
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/**
 * POST /api/ingest
 *
 * Accepts two formats:
 *   1. JSON body:  { "transactions": [ { id, timestamp, amount, merchant, category, account_from, account_to }, ... ] }
 *   2. Multipart:  form-data with a 'file' field containing a CSV
 *
 * Returns: { jobId, allJobIds, rowCount, enqueuedBatches }
 */
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const hasData = (req.body && req.body.transactions && req.body.transactions.length > 0) || req.file;
    if (!hasData) {
      return res.status(400).json({ success: false, error: 'No valid input or 0 transactions provided.' });
    }

    const result = await ingestAndEnqueue(req.body, req.file || null);
    res.status(202).json({
      success: true,
      message: `${result.rowCount} transactions ingested, ${result.enqueuedBatches} batch(es) enqueued`,
      ...result,
    });
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('validation failed')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;