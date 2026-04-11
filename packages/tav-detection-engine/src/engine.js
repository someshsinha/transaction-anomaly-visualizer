const { findCycles } = require('./algorithms/cycleDetection');
const { checkVelocity } = require('./algorithms/velocityCheck');
const { checkThresholdProximity } = require('./algorithms/thresholdProximity');
const { checkTimestampDelta } = require('./algorithms/timestampDelta');

class TAVEngine {
  constructor(config = {}) {
    this.config = {
      velocityThreshold: config.velocityThreshold || 10,
      velocityWindowMs: config.velocityWindowMs || 3600000,
      reportingLimit: config.reportingLimit || 10000,
      proximityPercent: config.proximityPercent || 0.15,
      timestampDeltaMs: config.timestampDeltaMs || 60000,
      neo4jUri: config.neo4jUri || null, // placeholder if graph builder is needed
      neo4jUser: config.neo4jUser || null,
      neo4jPassword: config.neo4jPassword || null,
      ...config
    };
  }

  // Parses a raw CSV output array into the native node/edge graph payload
  // required by the internal algorithm suite.
  parseInputToGraph(transactions) {
    if (!Array.isArray(transactions)) {
      throw new Error('TAVEngine requires an array of transaction objects');
    }

    const nodeSet = new Set();
    const edges = transactions.map(t => {
      nodeSet.add(t.account_from);
      nodeSet.add(t.account_to);
      return {
        id: t.id,
        from: t.account_from,
        to: t.account_to,
        amount: parseFloat(t.amount),
        timestamp: t.timestamp instanceof Date ? t.timestamp.toISOString() : t.timestamp,
        merchant: t.merchant || null
      };
    });

    const nodes = [...nodeSet].map(id => ({ id }));
    return { nodes, edges };
  }

  analyzeTransactions(transactions) {
    const { nodes, edges } = this.parseInputToGraph(transactions);
    
    // Direct algorithm calls if the user doesn't pass pre-parsed graphs
    return this.analyzeGraph(nodes, edges);
  }

  analyzeGraph(nodes, edges) {
    const cycleAlerts = findCycles(nodes, edges);
    const velocityAlerts = checkVelocity(edges, this.config.velocityThreshold, this.config.velocityWindowMs);
    const proximityAlerts = checkThresholdProximity(edges, this.config.reportingLimit, this.config.reportingLimit * this.config.proximityPercent);
    const timeAlerts = checkTimestampDelta(edges, this.config.timestampDeltaMs);

    return [...cycleAlerts, ...velocityAlerts, ...proximityAlerts, ...timeAlerts];
  }
}

module.exports = { TAVEngine };
