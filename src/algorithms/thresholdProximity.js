// src/algorithms/thresholdProximity.js
// Threshold proximity analysis: detects transactions whose amounts sit
// suspiciously close to a reporting threshold (e.g. $10,000 AML limit).
// This pattern is known as "structuring" or "smurfing" in fraud detection.
//
// Input:  edges       = [{ id, from, to, amount, timestamp }]
//         threshold   — the regulatory reporting amount (default: 10000)
//         proximity   — how close to the threshold counts as suspicious (default: 500)
// Output: array of flagged anomalies

/**
 * Flags any transfer whose amount falls within [threshold - proximity, threshold).
 * We deliberately exclude amounts >= threshold because those get reported anyway;
 * the fraud signal is the deliberate stay-just-below pattern.
 */
const checkThresholdProximity = (edges, threshold = 10_000, proximity = 500) => {
  const lowerBound = threshold - proximity;
  const alerts = [];

  edges.forEach(e => {
    const amount = parseFloat(e.amount);
    if (amount >= lowerBound && amount < threshold) {
      alerts.push({
        type: 'THRESHOLD_PROXIMITY',
        edgeId: e.id,
        from: e.from,
        to: e.to,
        amount,
        threshold,
        delta: parseFloat((threshold - amount).toFixed(2)),
      });
    }
  });

  return alerts;
};

module.exports = { checkThresholdProximity };