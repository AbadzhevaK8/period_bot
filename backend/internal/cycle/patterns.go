package cycle

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/medina/cycle-calendar/backend/internal/models"
)

func FindPatterns(ctx context.Context, pool *pgxpool.Pool, userID int64) ([]models.Pattern, error) {
	entry, err := GetLatestEntry(ctx, pool, userID)
	if err != nil {
		return nil, err
	}

	to := time.Now()
	if entry.PeriodStart.After(to) {
		to = entry.PeriodStart.AddDate(0, 0, entry.CycleLength*3)
	}
	from := entry.PeriodStart.AddDate(0, 0, -entry.CycleLength*2)

	logs, err := GetSymptomHistory(ctx, pool, userID, from, to)
	if err != nil {
		return nil, err
	}

	return FindPatternsFromLogs(logs, *entry), nil
}

func FindPatternsFromLogs(logs []models.SymptomLog, entry models.CycleEntry) []models.Pattern {
	seenCycles := map[string]map[string]map[int]bool{}

	for _, log := range logs {
		phaseName := GetPhaseForDate(log.LogDate, entry).Name
		if seenCycles[phaseName] == nil {
			seenCycles[phaseName] = map[string]map[int]bool{}
		}
		cycleIndex := cycleIndexForDate(log.LogDate, entry)
		if log.Energy <= 2 {
			markSymptomCycle(seenCycles[phaseName], "low_energy", cycleIndex)
		}
		if log.Energy >= 4 {
			markSymptomCycle(seenCycles[phaseName], "high_energy", cycleIndex)
		}
		for _, symptom := range append(log.Mood, log.Body...) {
			symptom = strings.TrimSpace(symptom)
			if symptom != "" {
				markSymptomCycle(seenCycles[phaseName], symptom, cycleIndex)
			}
		}
	}

	patterns := make([]models.Pattern, 0)
	for phase, symptomCycles := range seenCycles {
		for symptom, cycles := range symptomCycles {
			occurrences := len(cycles)
			if occurrences < 2 {
				continue
			}
			patterns = append(patterns, models.Pattern{
				Phase:       phase,
				Symptom:     symptom,
				Occurrences: occurrences,
				Message:     patternMessage(phase, symptom, occurrences),
			})
		}
	}

	sort.Slice(patterns, func(i, j int) bool {
		if patterns[i].Occurrences == patterns[j].Occurrences {
			if patterns[i].Phase == patterns[j].Phase {
				return patterns[i].Symptom < patterns[j].Symptom
			}
			return patterns[i].Phase < patterns[j].Phase
		}
		return patterns[i].Occurrences > patterns[j].Occurrences
	})

	return patterns
}

func markSymptomCycle(symptomCycles map[string]map[int]bool, symptom string, cycleIndex int) {
	if symptomCycles[symptom] == nil {
		symptomCycles[symptom] = map[int]bool{}
	}
	symptomCycles[symptom][cycleIndex] = true
}

func cycleIndexForDate(date time.Time, entry models.CycleEntry) int {
	cycleLength := entry.CycleLength
	if cycleLength <= 0 {
		cycleLength = 28
	}
	start := entry.PeriodStart.Truncate(24 * time.Hour)
	current := date.Truncate(24 * time.Hour)
	days := int(current.Sub(start).Hours() / 24)
	if days >= 0 {
		return days / cycleLength
	}
	return -((-days + cycleLength - 1) / cycleLength)
}

func patternMessage(phase, symptom string, occurrences int) string {
	return fmt.Sprintf("%s повторяется в фазе %s уже %d раза. Это похоже на личный паттерн.", symptomLabel(symptom), phaseLabel(phase), occurrences)
}

func phaseLabel(phase string) string {
	switch phase {
	case "menstruation":
		return "менструации"
	case "follicular":
		return "фолликулярной"
	case "ovulation":
		return "овуляции"
	case "luteal":
		return "лютеиновой"
	default:
		return phase
	}
}

func symptomLabel(symptom string) string {
	labels := map[string]string{
		"low_energy":        "низкая энергия",
		"high_energy":       "высокая энергия",
		"calm":              "спокойствие",
		"happy":             "хорошее настроение",
		"irritable":         "раздражительность",
		"anxious":           "тревожность",
		"sad":               "грусть",
		"cramps":            "спазмы",
		"bloating":          "вздутие",
		"headache":          "головная боль",
		"breast_tenderness": "чувствительность груди",
		"back_pain":         "боль в спине",
	}
	if label, ok := labels[symptom]; ok {
		return label
	}
	return symptom
}
