package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"

	"github.com/medina/cycle-calendar/backend/config"
	"github.com/medina/cycle-calendar/backend/internal/api"
	"github.com/medina/cycle-calendar/backend/internal/bot"
	"github.com/medina/cycle-calendar/backend/internal/db"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file loaded: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	b, err := bot.NewBot(cfg.BotToken, cfg.WebAppURL)
	if err != nil {
		log.Fatalf("failed to create telegram bot: %v", err)
	}
	go func() {
		log.Printf("starting telegram bot")
		b.Start()
	}()

	pool, err := db.NewPool(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	defer pool.Close()

	app := fiber.New()
	api.RegisterAuthRoutes(app, cfg.BotToken, cfg.JWTSecret, pool)

	log.Printf("starting backend on :%s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
