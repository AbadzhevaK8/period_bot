package models

import "time"

type CycleEntry struct {
	ID           int       `json:"id"`
	UserID       int64     `json:"userId"`
	PeriodStart  time.Time `json:"periodStart"`
	CycleLength  int       `json:"cycleLength"`
	PeriodLength int       `json:"periodLength"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Phase struct {
	Name       string `json:"name"`
	DayOfCycle int    `json:"dayOfCycle"`
	Color      string `json:"color"`
	Energy     string `json:"energy"`
}

type DayInfo struct {
	Date       string `json:"date"`
	DayOfCycle int    `json:"dayOfCycle"`
	Phase      Phase  `json:"phase"`
	Forecast   string `json:"forecast"`
}
