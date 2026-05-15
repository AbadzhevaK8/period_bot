package api

import (
	"errors"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/medina/cycle-calendar/backend/internal/auth"
	"github.com/medina/cycle-calendar/backend/internal/cycle"
	"github.com/medina/cycle-calendar/backend/internal/models"
)

const (
	dateLayout      = "2006-01-02"
	maxCalendarDays = 90
)

type cycleRequest struct {
	PeriodStart  string `json:"periodStart"`
	CycleLength  int    `json:"cycleLength"`
	PeriodLength int    `json:"periodLength"`
}

type cycleResponse struct {
	ID           int    `json:"id"`
	UserID       int64  `json:"userId"`
	PeriodStart  string `json:"periodStart"`
	CycleLength  int    `json:"cycleLength"`
	PeriodLength int    `json:"periodLength"`
	CreatedAt    string `json:"createdAt"`
}

func RegisterCycleRoutes(app *fiber.App, jwtSecret string, pool *pgxpool.Pool) {
	api := app.Group("/api", auth.JWTMiddleware(jwtSecret))

	api.Post("/cycle", func(c *fiber.Ctx) error {
		userID, ok := userIDFromContext(c)
		if !ok {
			return fiber.ErrUnauthorized
		}

		var req cycleRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}

		entry, err := cycleEntryFromRequest(req, userID)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}

		if err := cycle.SaveCycleEntry(c.Context(), pool, entry); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to save cycle entry")
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "ok"})
	})

	api.Get("/cycle", func(c *fiber.Ctx) error {
		userID, ok := userIDFromContext(c)
		if !ok {
			return fiber.ErrUnauthorized
		}

		entry, err := cycle.GetLatestEntry(c.Context(), pool, userID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "cycle entry not found")
			}
			log.Printf("[cycle] get latest failed user_id=%d err=%v", userID, err)
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get cycle entry")
		}

		return c.Status(fiber.StatusOK).JSON(cycleEntryResponse(*entry))
	})

	api.Get("/calendar", func(c *fiber.Ctx) error {
		userID, ok := userIDFromContext(c)
		if !ok {
			return fiber.ErrUnauthorized
		}

		from, to, err := parseCalendarRange(c.Query("from"), c.Query("to"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}

		entry, err := cycle.GetLatestEntry(c.Context(), pool, userID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusBadRequest, "cycle data is required")
			}
			log.Printf("[calendar] get latest failed user_id=%d err=%v", userID, err)
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get cycle entry")
		}

		return c.Status(fiber.StatusOK).JSON(cycle.GetCalendar(from, to, *entry))
	})
}

func userIDFromContext(c *fiber.Ctx) (int64, bool) {
	userID, ok := c.Locals("userID").(int64)
	return userID, ok
}

func cycleEntryFromRequest(req cycleRequest, userID int64) (models.CycleEntry, error) {
	periodStart, err := time.Parse(dateLayout, req.PeriodStart)
	if err != nil {
		return models.CycleEntry{}, errors.New("periodStart must be YYYY-MM-DD")
	}
	if req.CycleLength < 21 || req.CycleLength > 40 {
		return models.CycleEntry{}, errors.New("cycleLength must be between 21 and 40")
	}
	if req.PeriodLength < 2 || req.PeriodLength > 10 {
		return models.CycleEntry{}, errors.New("periodLength must be between 2 and 10")
	}

	return models.CycleEntry{
		UserID:       userID,
		PeriodStart:  periodStart,
		CycleLength:  req.CycleLength,
		PeriodLength: req.PeriodLength,
	}, nil
}

func parseCalendarRange(fromValue, toValue string) (time.Time, time.Time, error) {
	if fromValue == "" || toValue == "" {
		return time.Time{}, time.Time{}, errors.New("from and to query params are required")
	}

	from, err := time.Parse(dateLayout, fromValue)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("from must be YYYY-MM-DD")
	}
	to, err := time.Parse(dateLayout, toValue)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("to must be YYYY-MM-DD")
	}
	if to.Before(from) {
		return time.Time{}, time.Time{}, errors.New("to must be on or after from")
	}
	if int(to.Sub(from).Hours()/24)+1 > maxCalendarDays {
		return time.Time{}, time.Time{}, errors.New("calendar range must be 90 days or less")
	}

	return from, to, nil
}

func cycleEntryResponse(entry models.CycleEntry) cycleResponse {
	return cycleResponse{
		ID:           entry.ID,
		UserID:       entry.UserID,
		PeriodStart:  entry.PeriodStart.Format(dateLayout),
		CycleLength:  entry.CycleLength,
		PeriodLength: entry.PeriodLength,
		CreatedAt:    entry.CreatedAt.Format(time.RFC3339),
	}
}
