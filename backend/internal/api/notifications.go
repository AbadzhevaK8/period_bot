package api

import (
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/medina/cycle-calendar/backend/internal/auth"
	"github.com/medina/cycle-calendar/backend/internal/models"
	"github.com/medina/cycle-calendar/backend/internal/notifications"
)

type notificationSettingsRequest struct {
	Enabled    bool   `json:"enabled"`
	NotifyTime string `json:"notifyTime"`
	Timezone   string `json:"timezone"`
}

func RegisterNotificationRoutes(app *fiber.App, jwtSecret string, pool *pgxpool.Pool) {
	api := app.Group("/api", auth.JWTMiddleware(jwtSecret))

	api.Get("/settings/notifications", func(c *fiber.Ctx) error {
		userID, ok := userIDFromContext(c)
		if !ok {
			return fiber.ErrUnauthorized
		}

		settings, err := notifications.GetSettings(c.Context(), pool, userID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				defaultSettings := models.NotificationSettings{
					UserID:     userID,
					Enabled:    false,
					NotifyTime: "09:00",
					Timezone:   "Europe/Moscow",
				}
				if err := notifications.SaveSettings(c.Context(), pool, defaultSettings); err != nil {
					return fiber.NewError(fiber.StatusInternalServerError, "failed to create notification settings")
				}
				settings, err = notifications.GetSettings(c.Context(), pool, userID)
				if err != nil {
					return fiber.NewError(fiber.StatusInternalServerError, "failed to get notification settings")
				}
				return c.Status(fiber.StatusOK).JSON(settings)
			}
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get notification settings")
		}

		return c.Status(fiber.StatusOK).JSON(settings)
	})

	api.Put("/settings/notifications", func(c *fiber.Ctx) error {
		userID, ok := userIDFromContext(c)
		if !ok {
			return fiber.ErrUnauthorized
		}

		var req notificationSettingsRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}

		settings, err := notificationSettingsFromRequest(req, userID)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		if err := notifications.SaveSettings(c.Context(), pool, settings); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to save notification settings")
		}

		saved, err := notifications.GetSettings(c.Context(), pool, userID)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to get notification settings")
		}
		return c.Status(fiber.StatusOK).JSON(saved)
	})
}

func notificationSettingsFromRequest(req notificationSettingsRequest, userID int64) (models.NotificationSettings, error) {
	notifyTime := strings.TrimSpace(req.NotifyTime)
	if len(notifyTime) != 5 {
		return models.NotificationSettings{}, errors.New("notifyTime must be HH:MM")
	}
	if _, err := time.Parse("15:04", notifyTime); err != nil {
		return models.NotificationSettings{}, errors.New("notifyTime must be HH:MM")
	}

	timezone := strings.TrimSpace(req.Timezone)
	if timezone == "" || len(timezone) > 64 {
		return models.NotificationSettings{}, errors.New("timezone is required")
	}
	if _, err := time.LoadLocation(timezone); err != nil {
		return models.NotificationSettings{}, errors.New("timezone must be valid")
	}

	return models.NotificationSettings{
		UserID:     userID,
		Enabled:    req.Enabled,
		NotifyTime: notifyTime,
		Timezone:   timezone,
	}, nil
}
