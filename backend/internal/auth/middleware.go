package auth

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type AuthClaims struct {
	UserID int64
}

func JWTMiddleware(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		auth := c.Get("Authorization")
		if auth == "" {
			return fiber.ErrUnauthorized
		}

		parts := strings.SplitN(auth, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return fiber.ErrUnauthorized
		}

		tokenValue := parts[1]
		if tokenValue == "" {
			return fiber.ErrUnauthorized
		}

		parsed, err := jwt.Parse(tokenValue, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(secret), nil
		})
		if err != nil || !parsed.Valid {
			return fiber.ErrUnauthorized
		}

		claims, ok := parsed.Claims.(jwt.MapClaims)
		if !ok {
			return fiber.ErrUnauthorized
		}

		sub, ok := claims["sub"].(string)
		if !ok {
			return fiber.ErrUnauthorized
		}

		userID, err := strconv.ParseInt(sub, 10, 64)
		if err != nil {
			return fiber.ErrUnauthorized
		}

		c.Locals("userID", userID)
		return c.Next()
	}
}
