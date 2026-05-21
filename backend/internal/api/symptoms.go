package api

import (
	"errors"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/medina/cycle-calendar/backend/internal/auth"
	"github.com/medina/cycle-calendar/backend/internal/cycle"
	"github.com/medina/cycle-calendar/backend/internal/models"
)

type symptomRequest struct {
	Date   string   `json:"date"`
	Energy int      `json:"energy"`
	Mood   []string `json:"mood"`
	Body   []string `json:"body"`
	Note   string   `json:"note"`
}

type symptomResponse struct {
	ID        int      `json:"id"`
	UserID    int64    `json:"userId"`
	Date      string   `json:"date"`
	Energy    int      `json:"energy"`
	Mood      []string `json:"mood"`
	Body      []string `json:"body"`
	Note      string   `json:"note"`
	CreatedAt string   `json:"createdAt"`
}

func RegisterSymptomRoutes(app *fiber.App, jwtSecret string, pool *pgxpool.Pool) {
	api := app.Group("/api", auth.JWTMiddleware(jwtSecret))

	api.Post("/symptoms", func(c *fiber.Ctx) error {
		userID, ok := userIDFromContext(c)
		if !ok {
			return fiber.ErrUnauthorized
		}

		var req symptomRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}
		logEntry, err := symptomLogFromRequest(req, userID)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}

		if err := cycle.SaveSymptomLog(c.Context(), pool, logEntry); err != nil {
			log.Printf("[symptoms] save failed user_id=%d err=%v", userID, err)
			return fiber.NewError(fiber.StatusInternalServerError, "failed to save symptoms")
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "ok"})
	})

	api.Get("/symptoms", func(c *fiber.Ctx) error {
		userID, ok := userIDFromContext(c)
		if !ok {
			return fiber.ErrUnauthorized
		}

		from, to, err := parseCalendarRange(c.Query("from"), c.Query("to"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}

		logs, err := cycle.GetSymptomHistory(c.Context(), pool, userID, from, to)
		if err != nil {
			log.Printf("[symptoms] history failed user_id=%d err=%v", userID, err)
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get symptoms")
		}

		response := make([]symptomResponse, 0, len(logs))
		for _, logEntry := range logs {
			response = append(response, symptomLogResponse(logEntry))
		}
		return c.Status(fiber.StatusOK).JSON(response)
	})

	api.Get("/symptoms/:date", func(c *fiber.Ctx) error {
		userID, ok := userIDFromContext(c)
		if !ok {
			return fiber.ErrUnauthorized
		}

		date, err := time.Parse(dateLayout, c.Params("date"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "date must be YYYY-MM-DD")
		}

		logEntry, err := cycle.GetSymptomLog(c.Context(), pool, userID, date)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "symptom log not found")
			}
			log.Printf("[symptoms] get failed user_id=%d date=%s err=%v", userID, c.Params("date"), err)
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get symptoms")
		}

		return c.Status(fiber.StatusOK).JSON(symptomLogResponse(*logEntry))
	})

	api.Get("/insights", func(c *fiber.Ctx) error {
		userID, ok := userIDFromContext(c)
		if !ok {
			return fiber.ErrUnauthorized
		}

		patterns, err := cycle.FindPatterns(c.Context(), pool, userID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusBadRequest, "cycle data is required")
			}
			log.Printf("[insights] find patterns failed user_id=%d err=%v", userID, err)
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get insights")
		}

		return c.Status(fiber.StatusOK).JSON(patterns)
	})
}

func symptomLogFromRequest(req symptomRequest, userID int64) (models.SymptomLog, error) {
	date, err := time.Parse(dateLayout, req.Date)
	if err != nil {
		return models.SymptomLog{}, errors.New("date must be YYYY-MM-DD")
	}
	if req.Energy < 1 || req.Energy > 5 {
		return models.SymptomLog{}, errors.New("energy must be between 1 and 5")
	}
	if len(req.Mood) > 12 || len(req.Body) > 12 {
		return models.SymptomLog{}, errors.New("too many symptoms selected")
	}
	if len(req.Note) > 1000 {
		return models.SymptomLog{}, errors.New("note must be 1000 characters or less")
	}

	return models.SymptomLog{
		UserID:  userID,
		LogDate: date,
		Energy:  req.Energy,
		Mood:    cleanValues(req.Mood),
		Body:    cleanValues(req.Body),
		Note:    strings.TrimSpace(req.Note),
	}, nil
}

func cleanValues(values []string) []string {
	cleaned := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		cleaned = append(cleaned, value)
	}
	return cleaned
}

func symptomLogResponse(logEntry models.SymptomLog) symptomResponse {
	return symptomResponse{
		ID:        logEntry.ID,
		UserID:    logEntry.UserID,
		Date:      logEntry.LogDate.Format(dateLayout),
		Energy:    logEntry.Energy,
		Mood:      logEntry.Mood,
		Body:      logEntry.Body,
		Note:      logEntry.Note,
		CreatedAt: logEntry.CreatedAt.Format(time.RFC3339),
	}
}
