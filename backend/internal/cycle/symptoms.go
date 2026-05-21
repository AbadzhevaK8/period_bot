package cycle

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/medina/cycle-calendar/backend/internal/models"
)

func SaveSymptomLog(ctx context.Context, pool *pgxpool.Pool, log models.SymptomLog) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO symptom_logs (user_id, log_date, energy, mood, body, note)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, log_date)
		DO UPDATE SET
			energy = EXCLUDED.energy,
			mood = EXCLUDED.mood,
			body = EXCLUDED.body,
			note = EXCLUDED.note
	`, log.UserID, log.LogDate, log.Energy, log.Mood, log.Body, log.Note)
	return err
}

func GetSymptomLog(ctx context.Context, pool *pgxpool.Pool, userID int64, date time.Time) (*models.SymptomLog, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, user_id, log_date, energy, mood, body, note, created_at
		FROM symptom_logs
		WHERE user_id = $1 AND log_date = $2
	`, userID, date)

	var log models.SymptomLog
	if err := row.Scan(&log.ID, &log.UserID, &log.LogDate, &log.Energy, &log.Mood, &log.Body, &log.Note, &log.CreatedAt); err != nil {
		return nil, err
	}
	return &log, nil
}

func GetSymptomHistory(ctx context.Context, pool *pgxpool.Pool, userID int64, from, to time.Time) ([]models.SymptomLog, error) {
	rows, err := pool.Query(ctx, `
		SELECT id, user_id, log_date, energy, mood, body, note, created_at
		FROM symptom_logs
		WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
		ORDER BY log_date ASC
	`, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := make([]models.SymptomLog, 0)
	for rows.Next() {
		var log models.SymptomLog
		if err := rows.Scan(&log.ID, &log.UserID, &log.LogDate, &log.Energy, &log.Mood, &log.Body, &log.Note, &log.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, rows.Err()
}
