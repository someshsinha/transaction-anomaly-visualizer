// src/routes/analyze.js
const express = require('express');
const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');
const { getAnomaliesByJob } = require('../services/analyzeService');

const router = express.Router();
const analysisQueue = new Queue('tav-analysis', { connection: redisConfig });

/**
 * GET /api/analyze/status
 * Returns current bullmq task counts.
 */
router.get('/status', async (req, res, next) => {
  try {
    const counts = await analysisQueue.getJobCounts('waiting', 'active', 'failed', 'delayed');
    res.json({ success: true, counts });
  } catch (err) {
    next(err);
  }
});

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