-- src/db/init.sql

CREATE TABLE IF NOT EXISTS transactions (
    id           UUID PRIMARY KEY,
    timestamp    TIMESTAMPTZ NOT NULL,
    amount       DECIMAL(12, 2) NOT NULL,
    merchant     TEXT,
    category     TEXT,
    account_from TEXT NOT NULL,
    account_to   TEXT NOT NULL
);

-- Stores every anomaly the worker detects.
-- details (JSONB) holds the full algorithm output so the dashboard can
-- query by type, render cycle paths, highlight flagged nodes, etc.
CREATE TABLE IF NOT EXISTS anomalies (
    id            SERIAL PRIMARY KEY,
    batch_id      TEXT NOT NULL,
    anomaly_type  TEXT NOT NULL,          -- CYCLE | HIGH_VELOCITY | THRESHOLD_PROXIMITY | RAPID_SUCCESSION
    details       JSONB NOT NULL,
    detected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_type       ON anomalies (anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomalies_batch_id   ON anomalies (batch_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected   ON anomalies (detected_at DESC);