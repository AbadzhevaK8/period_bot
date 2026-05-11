package cycle

import (
	"time"

	"github.com/medina/cycle-calendar/backend/internal/models"
)

func GetPhaseForDate(date time.Time, entry models.CycleEntry) models.Phase {
	day := normalizeDayOfCycle(date, entry.PeriodStart, entry.CycleLength)
	phase := phaseForDay(day, entry)
	return phase
}

func GetCalendar(from, to time.Time, entry models.CycleEntry) []models.DayInfo {
	if to.Before(from) {
		from, to = to, from
	}

	calendar := make([]models.DayInfo, 0)
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		phase := GetPhaseForDate(d, entry)
		calendar = append(calendar, models.DayInfo{
			Date:       d.Format("2006-01-02"),
			DayOfCycle: normalizeDayOfCycle(d, entry.PeriodStart, entry.CycleLength),
			Phase:      phase,
			Forecast:   forecastForPhase(phase.Name),
		})
	}
	return calendar
}

func normalizeDayOfCycle(date, start time.Time, cycleLength int) int {
	if cycleLength <= 0 {
		cycleLength = 28
	}
	start = start.Truncate(24 * time.Hour)
	date = date.Truncate(24 * time.Hour)
	days := int(date.Sub(start).Hours() / 24)
	mod := days % cycleLength
	if mod < 0 {
		mod += cycleLength
	}
	return mod + 1
}

func phaseForDay(day int, entry models.CycleEntry) models.Phase {
	if entry.CycleLength <= 0 {
		entry.CycleLength = 28
	}
	if entry.PeriodLength <= 0 {
		entry.PeriodLength = 5
	}

	switch {
	case day <= entry.PeriodLength:
		return models.Phase{
			Name:       "menstruation",
			DayOfCycle: day,
			Color:      "#C1440E",
			Energy:     "low",
		}
	case day <= 13:
		return models.Phase{
			Name:       "follicular",
			DayOfCycle: day,
			Color:      "#2E7D32",
			Energy:     "rising",
		}
	case day <= 16:
		return models.Phase{
			Name:       "ovulation",
			DayOfCycle: day,
			Color:      "#F59E0B",
			Energy:     "peak",
		}
	default:
		return models.Phase{
			Name:       "luteal",
			DayOfCycle: day,
			Color:      "#6B21A8",
			Energy:     "falling",
		}
	}
}

func forecastForPhase(name string) string {
	switch name {
	case "menstruation":
		return "Отдыхайте, избегайте интенсивных нагрузок."
	case "follicular":
		return "Время для старта и новых планов."
	case "ovulation":
		return "Пик энергии и коммуникаций."
	case "luteal":
		return "Сосредоточьтесь на деталях и завершении дел."
	default:
		return "Следите за самочувствием и корректируйте график."
	}
}
