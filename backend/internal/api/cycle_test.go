package api

import "testing"

func TestCycleEntryFromRequest(t *testing.T) {
	entry, err := cycleEntryFromRequest(cycleRequest{
		PeriodStart:  "2026-05-01",
		CycleLength:  28,
		PeriodLength: 5,
	}, 123)
	if err != nil {
		t.Fatalf("expected valid cycle request, got error: %v", err)
	}
	if entry.UserID != 123 {
		t.Fatalf("expected user id 123, got %d", entry.UserID)
	}
	if entry.PeriodStart.Format(dateLayout) != "2026-05-01" {
		t.Fatalf("expected period start 2026-05-01, got %s", entry.PeriodStart.Format(dateLayout))
	}
}

func TestCycleEntryFromRequestValidation(t *testing.T) {
	tests := []struct {
		name string
		req  cycleRequest
	}{
		{
			name: "invalid date",
			req:  cycleRequest{PeriodStart: "05-01-2026", CycleLength: 28, PeriodLength: 5},
		},
		{
			name: "short cycle",
			req:  cycleRequest{PeriodStart: "2026-05-01", CycleLength: 20, PeriodLength: 5},
		},
		{
			name: "long cycle",
			req:  cycleRequest{PeriodStart: "2026-05-01", CycleLength: 41, PeriodLength: 5},
		},
		{
			name: "short period",
			req:  cycleRequest{PeriodStart: "2026-05-01", CycleLength: 28, PeriodLength: 1},
		},
		{
			name: "long period",
			req:  cycleRequest{PeriodStart: "2026-05-01", CycleLength: 28, PeriodLength: 11},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := cycleEntryFromRequest(tt.req, 123); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}

func TestParseCalendarRange(t *testing.T) {
	from, to, err := parseCalendarRange("2026-05-01", "2026-05-31")
	if err != nil {
		t.Fatalf("expected valid range, got error: %v", err)
	}
	if from.Format(dateLayout) != "2026-05-01" {
		t.Fatalf("expected from 2026-05-01, got %s", from.Format(dateLayout))
	}
	if to.Format(dateLayout) != "2026-05-31" {
		t.Fatalf("expected to 2026-05-31, got %s", to.Format(dateLayout))
	}
}

func TestParseCalendarRangeValidation(t *testing.T) {
	tests := []struct {
		name string
		from string
		to   string
	}{
		{name: "missing from", from: "", to: "2026-05-31"},
		{name: "missing to", from: "2026-05-01", to: ""},
		{name: "invalid from", from: "01.05.2026", to: "2026-05-31"},
		{name: "invalid to", from: "2026-05-01", to: "31.05.2026"},
		{name: "reversed range", from: "2026-05-31", to: "2026-05-01"},
		{name: "too long", from: "2026-05-01", to: "2026-08-01"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, _, err := parseCalendarRange(tt.from, tt.to); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}
