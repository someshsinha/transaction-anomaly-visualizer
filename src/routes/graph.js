// src/routes/graph.js
const express = require('express');
const { getSubgraph } = require('../services/graphService');

const router = express.Router();

/**
 * GET /api/graph/:accountId
 * Returns the 2-hop subgraph for the given account, ready for React visualization.
 */
router.get('/:accountId', async (req, res, next) => {
  try {
    const result = await getSubgraph(req.params.accountId);

    if (result.nodes.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Account ${req.params.accountId} not found in graph`,
      });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;