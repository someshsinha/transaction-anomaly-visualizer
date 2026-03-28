// src/routes/analyze.js
const express = require('express');
const { getAnomaliesByJob } = require('../services/analyzeService');

const router = express.Router();

/**
 * GET /api/analyze/:jobId
 * Returns anomaly results for the given batch/job ID.
 */
router.get('/:jobId', async (req, res, next) => {
  try {
    const result = await getAnomaliesByJob(req.params.jobId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;