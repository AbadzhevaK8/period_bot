package config

import (
	"errors"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	RedisURL    string
	BotToken    string
	WebAppURL   string
	JWTSecret   string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379/0"),
		BotToken:    os.Getenv("BOT_TOKEN"),
		WebAppURL:   os.Getenv("WEBAPP_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
	}

	if cfg.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	if cfg.BotToken == "" {
		return nil, errors.New("BOT_TOKEN is required")
	}
	if cfg.JWTSecret == "" {
		return nil, errors.New("JWT_SECRET is required")
	}
	if cfg.WebAppURL == "" {
		return nil, errors.New("WEBAPP_URL is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
