import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DayInfo, getCalendar, getCycle, saveCycle } from '../api/client'
import { applyTheme, dayCardStyleForTheme, getStoredTheme, phaseColorForTheme, phaseStyleForTheme, ThemeId } from '../theme'

const phaseLabels: Record<string, string> = {
  menstruation: 'Менструация',
  follicular: 'Активная фаза',
  ovulation: 'Овуляция',
  luteal: 'Бережная фаза',
}

const energyLabels: Record<string, string> = {
  low: 'Низкая энергия',
  rising: 'Энергия растёт',
  peak: 'Пик энергии',
  falling: 'Энергия снижается',
}

const monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthBounds(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  return { first, last }
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function defaultPeriodStart() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return formatDate(date)
}

function Calendar() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [days, setDays] = useState<DayInfo[]>([])
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart)
  const [cycleLength, setCycleLength] = useState(28)
  const [periodLength, setPeriodLength] = useState(5)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [theme] = useState<ThemeId>(getStoredTheme)

  const title = `${monthNames[month.getMonth()]} ${month.getFullYear()}`
  const todayKey = formatDate(new Date())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const calendarCells = useMemo(() => {
    const { first } = monthBounds(month)
    const leading = (first.getDay() + 6) % 7
    const byDate = new Map(days.map((day) => [day.date, day]))
    const cells: Array<{ date: Date; info?: DayInfo; inMonth: boolean }> = []

    const gridStart = new Date(first)
    gridStart.setDate(first.getDate() - leading)

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      const key = formatDate(date)
      cells.push({
        date,
        info: byDate.get(key),
        inMonth: date.getMonth() === month.getMonth(),
      })
    }

    return cells
  }, [days, month])

  const loadCalendar = async (targetMonth = month) => {
    setLoading(true)
    setError('')
    try {
      await getCycle()
      const { first, last } = monthBounds(targetMonth)
      const calendar = await getCalendar(formatDate(first), formatDate(last))
      setDays(calendar)
      setSelectedDay((current) => {
        if (current && calendar.some((day) => day.date === current.date)) {
          return current
        }
        return calendar.find((day) => day.date === formatDate(new Date())) || calendar[0] || null
      })
      setNeedsSetup(false)
    } catch (err) {
      const status = (err as any).status
      if (status === 401) {
        localStorage.removeItem('auth_token')
        navigate('/onboarding', { replace: true })
      } else if (status === 404 || status === 400) {
        setNeedsSetup(true)
      } else {
        setError('Не удалось загрузить календарь.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCalendar(month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveCycle({ periodStart, cycleLength, periodLength })
      await loadCalendar(month)
    } catch {
      setError('Не удалось сохранить данные цикла.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <h1>Календарь цикла</h1>
        <p>Загружаем календарь...</p>
      </div>
    )
  }

  if (needsSetup) {
    return (
      <div className="app-shell">
        <h1>Календарь цикла</h1>
        <form className="cycle-form" onSubmit={handleSubmit}>
          <label>
            Дата начала последней менструации
            <input value={periodStart} type="date" onChange={(event) => setPeriodStart(event.target.value)} required />
          </label>
          <label>
            Длина цикла
            <input
              value={cycleLength}
              type="number"
              min={21}
              max={40}
              onChange={(event) => setCycleLength(Number(event.target.value))}
              required
            />
          </label>
          <label>
            Длина менструации
            <input
              value={periodLength}
              type="number"
              min={2}
              max={10}
              onChange={(event) => setPeriodLength(Number(event.target.value))}
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? 'Сохраняем...' : 'Показать календарь'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="app-shell calendar-shell">
      <div className="calendar-header">
        <button type="button" aria-label="Предыдущий месяц" onClick={() => setMonth((value) => addMonths(value, -1))}>
          ‹
        </button>
        <h1>{title}</h1>
        <button type="button" aria-label="Следующий месяц" onClick={() => setMonth((value) => addMonths(value, 1))}>
          ›
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="weekdays">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="month-grid">
        {calendarCells.map((cell) => {
          const phase = cell.info?.phase
          const phaseColor = phaseColorForTheme(theme, phase?.name)
          const isToday = cell.info?.date === todayKey
          return (
            <div
              key={formatDate(cell.date)}
              className={`day-cell ${cell.inMonth ? '' : 'muted'} ${isToday ? 'today' : ''} ${cell.info?.date === selectedDay?.date ? 'selected' : ''}`}
              style={phase ? phaseStyleForTheme(theme, phaseColor) : undefined}
              role={cell.info ? 'button' : undefined}
              tabIndex={cell.info ? 0 : undefined}
              onClick={() => cell.info && setSelectedDay(cell.info)}
              onKeyDown={(event) => {
                if (cell.info && (event.key === 'Enter' || event.key === ' ')) {
                  setSelectedDay(cell.info)
                }
              }}
            >
              <span className="day-number">{cell.date.getDate()}</span>
              {cell.info && <span className="cycle-day">{cell.info.dayOfCycle}</span>}
            </div>
          )
        })}
      </div>

      {selectedDay && (
        <section className="day-card" style={dayCardStyleForTheme(theme, phaseColorForTheme(theme, selectedDay.phase.name))}>
          <div>
            <span className="day-card-date">
              {new Date(`${selectedDay.date}T00:00:00`).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
              })}
            </span>
            <h2>{phaseLabels[selectedDay.phase.name] || selectedDay.phase.name}</h2>
          </div>
          <div className="day-card-meta">
            <span>День цикла: {selectedDay.dayOfCycle}</span>
            <span>{energyLabels[selectedDay.phase.energy] || selectedDay.phase.energy}</span>
          </div>
          <p>{selectedDay.forecast}</p>
        </section>
      )}
    </div>
  )
}

export default Calendar
