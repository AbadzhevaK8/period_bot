package cycle

import (
	"testing"
	"time"

	"github.com/medina/cycle-calendar/backend/internal/models"
)

func TestGetPhaseForDate(t *testing.T) {
	entry := models.CycleEntry{
		PeriodStart:  time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC),
		CycleLength:  28,
		PeriodLength: 5,
	}

	tests := []struct {
		name  string
		date  time.Time
		phase string
		day   int
	}{
		{"day1 menstruation", time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC), "menstruation", 1},
		{"day14 ovulation", time.Date(2026, 5, 14, 0, 0, 0, 0, time.UTC), "ovulation", 14},
		{"day28 luteal", time.Date(2026, 5, 28, 0, 0, 0, 0, time.UTC), "luteal", 28},
		{"day29 next cycle", time.Date(2026, 5, 29, 0, 0, 0, 0, time.UTC), "menstruation", 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			phase := GetPhaseForDate(tt.date, entry)
			if phase.Name != tt.phase {
				t.Fatalf("expected phase %s, got %s", tt.phase, phase.Name)
			}
			if phase.DayOfCycle != tt.day {
				t.Fatalf("expected day %d, got %d", tt.day, phase.DayOfCycle)
			}
		})
	}
}

func TestGetPhaseForDateWithVariants(t *testing.T) {
	cases := []struct {
		name  string
		entry models.CycleEntry
		date  time.Time
		phase string
		day   int
	}{
		{"short cycle", models.CycleEntry{PeriodStart: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC), CycleLength: 21, PeriodLength: 3}, time.Date(2026, 5, 21, 0, 0, 0, 0, time.UTC), "luteal", 21},
		{"long cycle", models.CycleEntry{PeriodStart: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC), CycleLength: 35, PeriodLength: 7}, time.Date(2026, 5, 14, 0, 0, 0, 0, time.UTC), "ovulation", 14},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			phase := GetPhaseForDate(tt.date, tt.entry)
			if phase.Name != tt.phase {
				t.Fatalf("expected phase %s, got %s", tt.phase, phase.Name)
			}
			if phase.DayOfCycle != tt.day {
				t.Fatalf("expected day %d, got %d", tt.day, phase.DayOfCycle)
			}
		})
	}
}
