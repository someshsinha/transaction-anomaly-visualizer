// src/algorithms/timestampDelta.js
// Timestamp delta computation: detects accounts involved in rapid sequential
// transfers — where the time gap between consecutive outgoing transactions
// is suspiciously small.  This catches automated laundering scripts and
// fan-out fraud (one account rapidly distributing funds to many others).
//
// Input:  edges       = [{ id, from, to, amount, timestamp }]
//         minDeltaMs  — minimum acceptable gap between consecutive transfers
//                       from the same account (default: 60 seconds)
// Output: array of flagged anomalies

/**
 * For each source account, sorts its outgoing transfers by timestamp and
 * computes the gap between consecutive ones.  Any gap smaller than
 * minDeltaMs is flagged.
 */
const checkTimestampDelta = (edges, minDeltaMs = 60_000) => {
  // Group outgoing transfers by account
  const byAccount = {};
  edges.forEach(e => {
    if (!byAccount[e.from]) byAccount[e.from] = [];
    byAccount[e.from].push({
      edgeId: e.id,
      to: e.to,
      amount: parseFloat(e.amount),
      ts: new Date(e.timestamp).getTime(),
    });
  });

  const alerts = [];

  Object.entries(byAccount).forEach(([accountId, transfers]) => {
    // Sort chronologically
    transfers.sort((a, b) => a.ts - b.ts);

    for (let i = 1; i < transfers.length; i++) {
      const delta = transfers[i].ts - transfers[i - 1].ts;
      if (delta < minDeltaMs) {
        alerts.push({
          type: 'RAPID_SUCCESSION',
          node: accountId,
          edgeIdA: transfers[i - 1].edgeId,
          edgeIdB: transfers[i].edgeId,
          deltaMs: delta,
          minDeltaMs,
        });
      }
    }
  });

  return alerts;
};

module.exports = { checkTimestampDelta };