package cycle

import (
	"testing"
	"time"

	"github.com/medina/cycle-calendar/backend/internal/models"
)

func TestFindPatternsFromLogs(t *testing.T) {
	entry := models.CycleEntry{
		PeriodStart:  mustDate("2026-05-01"),
		CycleLength:  28,
		PeriodLength: 5,
	}
	logs := []models.SymptomLog{
		{LogDate: mustDate("2026-05-02"), Energy: 2, Body: []string{"cramps"}},
		{LogDate: mustDate("2026-05-30"), Energy: 1, Body: []string{"cramps"}},
		{LogDate: mustDate("2026-05-10"), Energy: 5, Mood: []string{"happy"}},
	}

	patterns := FindPatternsFromLogs(logs, entry)
	if len(patterns) != 2 {
		t.Fatalf("expected 2 patterns, got %d: %#v", len(patterns), patterns)
	}
	if patterns[0].Phase != "menstruation" {
		t.Fatalf("expected menstruation pattern, got %s", patterns[0].Phase)
	}
}

func TestFindPatternsFromLogsRequiresTwoOccurrences(t *testing.T) {
	entry := models.CycleEntry{
		PeriodStart:  mustDate("2026-05-01"),
		CycleLength:  28,
		PeriodLength: 5,
	}
	logs := []models.SymptomLog{
		{LogDate: mustDate("2026-05-10"), Energy: 3, Mood: []string{"happy"}},
	}

	if patterns := FindPatternsFromLogs(logs, entry); len(patterns) != 0 {
		t.Fatalf("expected no patterns, got %#v", patterns)
	}
}

func TestFindPatternsFromLogsIgnoresSameCycleDuplicates(t *testing.T) {
	entry := models.CycleEntry{
		PeriodStart:  mustDate("2026-05-01"),
		CycleLength:  28,
		PeriodLength: 5,
	}
	logs := []models.SymptomLog{
		{LogDate: mustDate("2026-05-02"), Energy: 3, Body: []string{"cramps"}},
		{LogDate: mustDate("2026-05-04"), Energy: 3, Body: []string{"cramps"}},
	}

	if patterns := FindPatternsFromLogs(logs, entry); len(patterns) != 0 {
		t.Fatalf("expected no patterns from duplicate symptoms in one cycle, got %#v", patterns)
	}
}

func mustDate(value string) time.Time {
	date, err := time.Parse("2006-01-02", value)
	if err != nil {
		panic(err)
	}
	return date
}
