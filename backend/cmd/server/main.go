package main

import (
	"context"
	"errors"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	"github.com/medina/cycle-calendar/backend/config"
	"github.com/medina/cycle-calendar/backend/internal/api"
	"github.com/medina/cycle-calendar/backend/internal/bot"
	"github.com/medina/cycle-calendar/backend/internal/db"
	"github.com/medina/cycle-calendar/backend/migrations"
)

func main() {
	if err := godotenv.Load(); err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			log.Printf("failed to load .env file: %v", err)
		}
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	pool, err := db.NewPool(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	defer pool.Close()

	migrationCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.ApplyMigrations(migrationCtx, pool, migrations.Files); err != nil {
		log.Fatalf("failed to apply migrations: %v", err)
	}

	b, err := bot.NewBot(cfg.BotToken, cfg.WebAppURL)
	if err != nil {
		log.Fatalf("failed to create telegram bot: %v", err)
	}
	go func() {
		log.Printf("starting telegram bot")
		b.Start()
	}()

	app := fiber.New()
	app.Use(logger.New())
	api.RegisterAuthRoutes(app, cfg.BotToken, cfg.JWTSecret, pool)
	api.RegisterCycleRoutes(app, cfg.JWTSecret, pool)

	log.Printf("starting backend on :%s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
