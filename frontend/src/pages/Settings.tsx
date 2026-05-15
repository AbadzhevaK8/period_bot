import { CSSProperties, FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCycle, saveCycle } from '../api/client'
import { applyTheme, getStoredTheme, ThemeId, themePhaseColors, themePreviewColors, themes } from '../theme'

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultPeriodStart() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return formatDate(date)
}

function Settings() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<ThemeId>(getStoredTheme)
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart)
  const [cycleLength, setCycleLength] = useState(28)
  const [periodLength, setPeriodLength] = useState(5)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    let mounted = true

    getCycle()
      .then((cycle) => {
        if (!mounted) return
        setPeriodStart(cycle.periodStart)
        setCycleLength(cycle.cycleLength)
        setPeriodLength(cycle.periodLength)
      })
      .catch((err) => {
        if (!mounted) return
        const code = (err as any).status
        if (code === 401) {
          localStorage.removeItem('auth_token')
          navigate('/onboarding', { replace: true })
          return
        }
        if (code !== 404) {
          setError('Не удалось загрузить настройки цикла.')
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [navigate])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setStatus('')

    try {
      await saveCycle({ periodStart, cycleLength, periodLength })
      setStatus('Настройки цикла сохранены.')
    } catch (err) {
      const code = (err as any).status
      if (code === 401) {
        localStorage.removeItem('auth_token')
        navigate('/onboarding', { replace: true })
        return
      }
      setError('Не удалось сохранить настройки цикла.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell settings-shell">
      <header className="page-header">
        <h1>Настройки</h1>
      </header>

      <section className="settings-section" aria-label="Тема календаря">
        <div>
          <h2>Тема</h2>
          <p>Выберите оформление календаря и фаз.</p>
        </div>
        <div className="theme-grid" aria-label="Темы оформления">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={theme === item.id ? 'active' : ''}
              aria-pressed={theme === item.id}
              style={{
                '--theme-preview-bg': themePreviewColors[item.id].background,
                '--theme-preview-text': themePreviewColors[item.id].text,
              } as CSSProperties}
              onClick={() => setTheme(item.id)}
            >
              <span className="theme-number">{item.id}</span>
              <span className="theme-label">{item.label}</span>
              <span className="theme-swatches" aria-hidden="true">
                {Object.entries(themePhaseColors[item.id]).map(([phase, color]) => (
                  <span key={phase} style={{ background: color }} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section" aria-label="Параметры цикла">
        <div>
          <h2>Цикл</h2>
          <p>Обновите дату начала и длину цикла, если прогноз съехал.</p>
        </div>

        {loading ? (
          <p className="settings-note">Загружаем данные цикла...</p>
        ) : (
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
            {status && <p className="success-text">{status}</p>}
            <button type="submit" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить цикл'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

export default Settings
