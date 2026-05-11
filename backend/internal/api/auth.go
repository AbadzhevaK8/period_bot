package api

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/medina/cycle-calendar/backend/internal/auth"
	"github.com/medina/cycle-calendar/backend/internal/users"
)

type telegramAuthRequest struct {
	InitData string `json:"initData"`
}

type telegramAuthResponse struct {
	Token string            `json:"token"`
	User  auth.TelegramUser `json:"user"`
}

func RegisterAuthRoutes(app *fiber.App, botToken, jwtSecret string, db *pgxpool.Pool) {
	app.Post("/api/auth/telegram", func(c *fiber.Ctx) error {
		var req telegramAuthRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}

		user, err := auth.ValidateInitData(req.InitData, botToken)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, err.Error())
		}

		if err := users.Upsert(c.Context(), db, user); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to save user")
		}

		token, err := createAuthToken(user, jwtSecret)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to create token")
		}

		return c.Status(fiber.StatusOK).JSON(telegramAuthResponse{
			Token: token,
			User:  *user,
		})
	})

	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "ok"})
	})
}

func createAuthToken(user *auth.TelegramUser, secret string) (string, error) {
	claims := jwt.MapClaims{
		"sub":      fmt.Sprintf("%d", user.ID),
		"name":     user.FirstName,
		"username": user.Username,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
