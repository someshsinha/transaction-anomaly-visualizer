// src/algorithms/velocityCheck.js
// BFS-based velocity checking: detects accounts sending an anomalously
// high number of transfers within a rolling time window.
//
// Input:  edges = [{ id, from, to, amount, timestamp }]
//         threshold  — max transfers allowed per account within the window
//         windowMs   — the rolling window size in milliseconds (default: 1 hour)
// Output: array of flagged anomalies, one per offending account

/**
 * Groups edges by source account, then for each account performs a
 * sliding-window count over time-sorted transfers.  If the count within
 * any window exceeds the threshold, the account is flagged exactly once
 * (with the worst-case window reported).
 */
const checkVelocity = (edges, threshold = 10, windowMs = 3_600_000) => {
  // Group edges by sender account
  const byAccount = {};
  edges.forEach(e => {
    if (!byAccount[e.from]) byAccount[e.from] = [];
    byAccount[e.from].push({ edgeId: e.id, ts: new Date(e.timestamp).getTime() });
  });

  const alerts = [];

  Object.entries(byAccount).forEach(([accountId, transfers]) => {
    // Sort transfers chronologically
    transfers.sort((a, b) => a.ts - b.ts);

    let maxCount = 0;
    let left = 0;

    // Sliding window — O(n) two-pointer
    for (let right = 0; right < transfers.length; right++) {
      // Shrink left boundary so window fits within windowMs
      while (transfers[right].ts - transfers[left].ts > windowMs) {
        left++;
      }
      const count = right - left + 1;
      if (count > maxCount) maxCount = count;
    }

    if (maxCount > threshold) {
      alerts.push({
        type: 'HIGH_VELOCITY',
        node: accountId,
        transferCount: maxCount,
        windowMs,
        threshold,
      });
    }
  });

  return alerts;
};

module.exports = { checkVelocity };