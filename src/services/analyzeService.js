// src/services/analyzeService.js
const pool = require('../db/postgres');

/**
 * Fetches all anomalies for a given jobId (batch_id) from PostgreSQL.
 * Groups results by anomaly type for clean API output.
 *
 * @param {string} jobId
 * @returns {{ jobId, totalAnomalies, byType, anomalies }}
 */
const getAnomaliesByJob = async (jobId) => {
  const { rows } = await pool.query(
    `SELECT id, batch_id, anomaly_type, details, detected_at
     FROM anomalies
     WHERE batch_id = $1
     ORDER BY detected_at ASC`,
    [jobId]
  );

  // Group by type for the dashboard
  const byType = {};
  rows.forEach(row => {
    const t = row.anomaly_type;
    if (!byType[t]) byType[t] = [];
    byType[t].push({
      anomalyId:  row.id,
      detectedAt: row.detected_at,
      ...row.details,   // spread full algorithm output (cyclePath, node, edgeId, etc.)
    });
  });

  return {
    jobId,
    status:          rows.length > 0 ? 'completed' : 'pending_or_clean',
    totalAnomalies:  rows.length,
    byType,
    anomalies:       rows,   // raw rows for any consumer that wants them flat
  };
};

module.exports = { getAnomaliesByJob };