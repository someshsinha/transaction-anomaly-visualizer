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
    const result = await ingestAndEnqueue(req.body, req.file || null);
    res.status(202).json({
      success: true,
      message: `${result.rowCount} transactions ingested, ${result.enqueuedBatches} batch(es) enqueued`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;