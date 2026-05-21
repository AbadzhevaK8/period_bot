CREATE TABLE IF NOT EXISTS symptom_logs (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    log_date DATE NOT NULL,
    energy INT NOT NULL CHECK (energy BETWEEN 1 AND 5),
    mood TEXT[] NOT NULL DEFAULT '{}',
    body TEXT[] NOT NULL DEFAULT '{}',
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_symptom_logs_user_date ON symptom_logs (user_id, log_date DESC);
