CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_entries_user_period_unique
ON cycle_entries (user_id, period_start);
