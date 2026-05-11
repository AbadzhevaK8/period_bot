package users

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/medina/cycle-calendar/backend/internal/auth"
)

func Upsert(ctx context.Context, pool *pgxpool.Pool, user *auth.TelegramUser) error {
	const query = `
INSERT INTO users (id, username, first_name, last_name, created_at, updated_at)
VALUES ($1, $2, $3, $4, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW()`

	_, err := pool.Exec(ctx, query,
		user.ID,
		nullString(user.Username),
		nullString(user.FirstName),
		nullString(user.LastName),
	)
	return err
}

func nullString(value string) interface{} {
	if value == "" {
		return nil
	}
	return value
}
