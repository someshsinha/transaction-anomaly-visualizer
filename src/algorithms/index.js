// src/algorithms/index.js
// Single entry point for the detection engine.
// This is the ONLY thing the queue worker (and external npm consumers) import.

const { findCycles } = require('./cycleDetection');
const { checkVelocity } = require('./velocityCheck');
const { checkThresholdProximity } = require('./thresholdProximity');
const { checkTimestampDelta } = require('./timestampDelta');

/**
 * Runs all 4 detection algorithms on a subgraph.
 *
 * @param {Array<{id: string}>} nodes
 * @param {Array<{id: string, from: string, to: string, amount: number, timestamp: string}>} edges
 * @param {Object} options  — optional overrides for algorithm thresholds
 * @returns {Array}         — flat array of all anomaly objects
 */
const runDetectionSuite = (nodes, edges, options = {}) => {
  const {
    velocityThreshold = 10,
    velocityWindowMs  = 3_600_000,   // 1 hour
    proximityThreshold = 10_000,
    proximityDelta     = 500,
    minTimestampDeltaMs = 60_000,    // 60 seconds
  } = options;

  const anomalies = [];

  // 1. DFS Cycle Detection
  const cycles = findCycles(nodes, edges);
  anomalies.push(...cycles);

  // 2. BFS Velocity Checking (sliding window, not naive count)
  const velocityAlerts = checkVelocity(edges, velocityThreshold, velocityWindowMs);
  anomalies.push(...velocityAlerts);

  // 3. Threshold Proximity Analysis (structuring / smurfing detection)
  const proximityAlerts = checkThresholdProximity(edges, proximityThreshold, proximityDelta);
  anomalies.push(...proximityAlerts);

  // 4. Timestamp Delta Computation (rapid-succession transfers)
  const deltaAlerts = checkTimestampDelta(edges, minTimestampDeltaMs);
  anomalies.push(...deltaAlerts);

  return anomalies;
};

module.exports = {
  runDetectionSuite,
  // Also export individual algorithms so the npm package stays useful
  findCycles,
  checkVelocity,
  checkThresholdProximity,
  checkTimestampDelta,
};