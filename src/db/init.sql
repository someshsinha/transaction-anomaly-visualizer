-- src/db/init.sql
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    merchant TEXT,
    category TEXT,
    account_from TEXT NOT NULL,
    account_to TEXT NOT NULL
);