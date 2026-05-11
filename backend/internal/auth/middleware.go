package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
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

		token := parts[1]
		if token == "" {
			return fiber.ErrUnauthorized
		}

		// TODO: decode JWT and add user claims to context.
		c.Locals("userID", int64(0))
		return c.Next()
	}
}
