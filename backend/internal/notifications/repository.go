package notifications

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/medina/cycle-calendar/backend/internal/models"
)

func EnsureDefaultSettings(ctx context.Context, pool *pgxpool.Pool, userID int64) error {
	const query = `
INSERT INTO notification_settings (user_id)
VALUES ($1)
ON CONFLICT (user_id) DO NOTHING`

	_, err := pool.Exec(ctx, query, userID)
	return err
}

func GetSettings(ctx context.Context, pool *pgxpool.Pool, userID int64) (*models.NotificationSettings, error) {
	const query = `
SELECT user_id, enabled, to_char(notify_time, 'HH24:MI'), timezone, created_at, updated_at
FROM notification_settings
WHERE user_id = $1`

	var settings models.NotificationSettings
	err := pool.QueryRow(ctx, query, userID).Scan(
		&settings.UserID,
		&settings.Enabled,
		&settings.NotifyTime,
		&settings.Timezone,
		&settings.CreatedAt,
		&settings.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

func SaveSettings(ctx context.Context, pool *pgxpool.Pool, settings models.NotificationSettings) error {
	const query = `
INSERT INTO notification_settings (user_id, enabled, notify_time, timezone, created_at, updated_at)
VALUES ($1, $2, $3::time, $4, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
	enabled = EXCLUDED.enabled,
	notify_time = EXCLUDED.notify_time,
	timezone = EXCLUDED.timezone,
	updated_at = NOW()`

	_, err := pool.Exec(ctx, query, settings.UserID, settings.Enabled, settings.NotifyTime, settings.Timezone)
	return err
}
