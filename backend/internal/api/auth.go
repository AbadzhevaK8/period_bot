package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strings"
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
		remoteIP := c.IP()

		// Read raw body and unmarshal flexibly (accept string or object for initData)
		var raw struct {
			InitData interface{} `json:"initData"`
		}
		body := c.Body()
		if err := json.Unmarshal(body, &raw); err != nil {
			log.Printf("[auth] %s invalid request body: %v bytes=%d", remoteIP, err, len(body))
			return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
		}

		// Normalize initData into a url-encoded string
		var initDataStr string
		switch v := raw.InitData.(type) {
		case string:
			initDataStr = v
		case map[string]interface{}:
			// deterministic ordering
			keys := make([]string, 0, len(v))
			for k := range v {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			parts := make([]string, 0, len(keys))
			for _, k := range keys {
				val := fmt.Sprint(v[k])
				parts = append(parts, fmt.Sprintf("%s=%s", k, url.QueryEscape(val)))
			}
			initDataStr = strings.Join(parts, "&")
		default:
			log.Printf("[auth] %s invalid initData type: %T", remoteIP, raw.InitData)
			return fiber.NewError(fiber.StatusBadRequest, "invalid initData")
		}

		user, err := auth.ValidateInitData(initDataStr, botToken)
		if err != nil {
			log.Printf("[auth] %s initData_len=%d auth failed: %v", remoteIP, len(initDataStr), err)
			return fiber.NewError(fiber.StatusUnauthorized, err.Error())
		}

		if err := users.Upsert(c.Context(), db, user); err != nil {
			log.Printf("[auth] %s user upsert failed id=%d err=%v", remoteIP, user.ID, err)
			return fiber.NewError(fiber.StatusInternalServerError, "failed to save user")
		}

		log.Printf("[auth] %s auth success id=%d username=%q first_name=%q", remoteIP, user.ID, user.Username, user.FirstName)
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

	app.Get("/api/bot/me", func(c *fiber.Ctx) error {
		url := fmt.Sprintf("https://api.telegram.org/bot%s/getMe", botToken)
		resp, err := http.Get(url)
		if err != nil {
			log.Printf("[bot] getMe failed: %v", err)
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "failed to reach telegram"})
		}
		defer resp.Body.Close()

		var body struct {
			Ok     bool `json:"ok"`
			Result struct {
				Username string `json:"username"`
			} `json:"result"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
			log.Printf("[bot] getMe decode failed: %v", err)
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "invalid response from telegram"})
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{"username": body.Result.Username})
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
