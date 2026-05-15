import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DayInfo, getCalendar, getCycle, saveCycle } from '../api/client'

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

type ThemeId =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'
  | '15'
  | '16'
type PhaseName = 'menstruation' | 'follicular' | 'ovulation' | 'luteal'

const themes: Array<{ id: ThemeId; label: string }> = [
  { id: '1', label: 'Neon Pop' },
  { id: '2', label: 'Candy Rush' },
  { id: '3', label: 'Primary Beat' },
  { id: '4', label: 'Tropical' },
  { id: '5', label: 'Cyber Acid' },
  { id: '6', label: 'Sunset' },
  { id: '7', label: 'Ocean Glow' },
  { id: '8', label: 'Berry Club' },
  { id: '9', label: 'Sorbet' },
  { id: '10', label: 'Carnival' },
  { id: '11', label: 'Heatwave' },
  { id: '12', label: 'Jewel Box' },
  { id: '13', label: 'Electric Sky' },
  { id: '14', label: 'Citrus' },
  { id: '15', label: 'Bubblegum' },
  { id: '16', label: 'Signal' },
]

function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value)
}

const themePhaseColors: Record<ThemeId, Record<PhaseName, string>> = {
  '1': { menstruation: '#FF2DAA', follicular: '#00F5A0', ovulation: '#FFE156', luteal: '#8A4FFF' },
  '2': { menstruation: '#FF6B9A', follicular: '#4ECDC4', ovulation: '#FFE66D', luteal: '#6A4CFF' },
  '3': { menstruation: '#0057FF', follicular: '#FF006E', ovulation: '#FFD500', luteal: '#00B050' },
  '4': { menstruation: '#00B4D8', follicular: '#FF9F1C', ovulation: '#F72585', luteal: '#70E000' },
  '5': { menstruation: '#B6FF00', follicular: '#00A3FF', ovulation: '#FF00C8', luteal: '#FF7A00' },
  '6': { menstruation: '#FF7A18', follicular: '#E83F6F', ovulation: '#3A0CA3', luteal: '#FFD166' },
  '7': { menstruation: '#0077B6', follicular: '#00B4D8', ovulation: '#90E0EF', luteal: '#7400B8' },
  '8': { menstruation: '#D81159', follicular: '#4361EE', ovulation: '#7209B7', luteal: '#FF8C42' },
  '9': { menstruation: '#FFAFCC', follicular: '#BDE0FE', ovulation: '#CAFFBF', luteal: '#FFC8DD' },
  '10': { menstruation: '#00BBF9', follicular: '#F15BB5', ovulation: '#FEE440', luteal: '#9B5DE5' },
  '11': { menstruation: '#F94144', follicular: '#F3722C', ovulation: '#F9C74F', luteal: '#43AA8B' },
  '12': { menstruation: '#009B72', follicular: '#2D00F7', ovulation: '#FFBA08', luteal: '#D00000' },
  '13': { menstruation: '#00F5D4', follicular: '#00BBF9', ovulation: '#F15BB5', luteal: '#FEE440' },
  '14': { menstruation: '#FFEA00', follicular: '#FF7B00', ovulation: '#80B918', luteal: '#00A8E8' },
  '15': { menstruation: '#FF70A6', follicular: '#70D6FF', ovulation: '#FF9770', luteal: '#E9FF70' },
  '16': { menstruation: '#0000FF', follicular: '#FF0000', ovulation: '#00C853', luteal: '#FFD600' },
}

function phaseColorForTheme(theme: ThemeId, phaseName?: string) {
  if (phaseName === 'menstruation' || phaseName === 'follicular' || phaseName === 'ovulation' || phaseName === 'luteal') {
    return themePhaseColors[theme][phaseName]
  }
  return themePhaseColors[theme].follicular
}

function readableTextColor(hexColor: string) {
  const hex = hexColor.replace('#', '')
  const channels = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((channel) => {
    const value = parseInt(channel, 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  const whiteContrast = 1.05 / (luminance + 0.05)
  const blackContrast = (luminance + 0.05) / 0.05

  return blackContrast >= whiteContrast ? '#111827' : '#FFFFFF'
}

function phaseStyleForTheme(_theme: ThemeId, phaseColor: string) {
  return {
    '--day-cell-text': readableTextColor(phaseColor),
    background: phaseColor,
  } as CSSProperties
}

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('period_theme')
    return isThemeId(saved) ? saved : '1'
  })

  const title = `${monthNames[month.getMonth()]} ${month.getFullYear()}`
  const todayKey = formatDate(new Date())

  useEffect(() => {
    localStorage.setItem('period_theme', theme)
    document.documentElement.dataset.theme = theme
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
      <div className="settings-bar">
        <button type="button" className="settings-button" onClick={() => setSettingsOpen((value) => !value)}>
          Настройки
        </button>
      </div>

      {settingsOpen && (
        <section className="settings-panel" aria-label="Настройки">
          <div>
            <h2>Темы</h2>
            <p>Выберите оформление календаря.</p>
          </div>
          <div className="theme-grid" aria-label="Темы оформления">
            {themes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={theme === item.id ? 'active' : ''}
                aria-pressed={theme === item.id}
                onClick={() => setTheme(item.id)}
              >
                <span className="theme-number">{item.id}</span>
                <span className="theme-label">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

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
        <section className="day-card" style={{ borderColor: phaseColorForTheme(theme, selectedDay.phase.name) }}>
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
