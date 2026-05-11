CREATE TABLE IF NOT EXISTS cycle_entries (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    period_start DATE NOT NULL,
    cycle_length INT DEFAULT 28,
    period_length INT DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cycle_entries_user_period ON cycle_entries (user_id, period_start DESC);
