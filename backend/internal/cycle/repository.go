package cycle

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/medina/cycle-calendar/backend/internal/models"
)

func SaveCycleEntry(ctx context.Context, pool *pgxpool.Pool, entry models.CycleEntry) error {
	_, err := pool.Exec(ctx, `
		WITH latest AS (
			SELECT id
			FROM cycle_entries
			WHERE user_id = $1
			ORDER BY period_start DESC, created_at DESC, id DESC
			LIMIT 1
		),
		updated AS (
			UPDATE cycle_entries
			SET period_start = $2,
				cycle_length = $3,
				period_length = $4
			WHERE id IN (SELECT id FROM latest)
			RETURNING id
		)
		INSERT INTO cycle_entries (user_id, period_start, cycle_length, period_length)
		SELECT $1, $2, $3, $4
		WHERE NOT EXISTS (SELECT 1 FROM updated)
	`, entry.UserID, entry.PeriodStart, entry.CycleLength, entry.PeriodLength)
	return err
}

func GetLatestEntry(ctx context.Context, pool *pgxpool.Pool, userID int64) (*models.CycleEntry, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, user_id, period_start, cycle_length, period_length, created_at
		FROM cycle_entries
		WHERE user_id = $1
		ORDER BY period_start DESC, created_at DESC, id DESC
		LIMIT 1
	`, userID)

	var entry models.CycleEntry
	if err := row.Scan(&entry.ID, &entry.UserID, &entry.PeriodStart, &entry.CycleLength, &entry.PeriodLength, &entry.CreatedAt); err != nil {
		return nil, err
	}
	return &entry, nil
}
