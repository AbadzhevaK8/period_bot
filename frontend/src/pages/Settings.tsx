import { CSSProperties, FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCycle, getNotificationSettings, saveCycle, saveNotificationSettings } from '../api/client'
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
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notifyTime, setNotifyTime] = useState('09:00')
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [notificationError, setNotificationError] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('')

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

  useEffect(() => {
    let mounted = true

    getNotificationSettings()
      .then((settings) => {
        if (!mounted) return
        setNotificationsEnabled(settings.enabled)
        setNotifyTime(settings.notifyTime)
        setTimezone(settings.timezone)
      })
      .catch((err) => {
        if (!mounted) return
        const code = (err as any).status
        if (code === 401) {
          localStorage.removeItem('auth_token')
          navigate('/onboarding', { replace: true })
          return
        }
        setNotificationError('Не удалось загрузить настройки уведомлений.')
      })
      .finally(() => {
        if (mounted) setNotificationsLoading(false)
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

  const adjustCycleLength = (delta: number) => {
    setCycleLength((value) => Math.min(40, Math.max(21, value + delta)))
  }

  const adjustPeriodLength = (delta: number) => {
    setPeriodLength((value) => Math.min(10, Math.max(2, value + delta)))
  }

  const handleNotificationSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setNotificationsSaving(true)
    setNotificationError('')
    setNotificationStatus('')

    try {
      const saved = await saveNotificationSettings({
        enabled: notificationsEnabled,
        notifyTime,
        timezone,
      })
      setNotificationsEnabled(saved.enabled)
      setNotifyTime(saved.notifyTime)
      setTimezone(saved.timezone)
      setNotificationStatus(saved.enabled ? 'Напоминания включены.' : 'Напоминания выключены.')
    } catch (err) {
      const code = (err as any).status
      if (code === 401) {
        localStorage.removeItem('auth_token')
        navigate('/onboarding', { replace: true })
        return
      }
      setNotificationError('Не удалось сохранить уведомления.')
    } finally {
      setNotificationsSaving(false)
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
            <label className="field-card">
              <span>Дата начала последней менструации</span>
              <input value={periodStart} type="date" onChange={(event) => setPeriodStart(event.target.value)} required />
            </label>

            <div className="field-card">
              <span>Длина цикла</span>
              <div className="number-stepper">
                <button type="button" aria-label="Уменьшить длину цикла" onClick={() => adjustCycleLength(-1)}>
                  -
                </button>
                <input
                  value={cycleLength}
                  type="number"
                  min={21}
                  max={40}
                  onChange={(event) => setCycleLength(Number(event.target.value))}
                  required
                />
                <button type="button" aria-label="Увеличить длину цикла" onClick={() => adjustCycleLength(1)}>
                  +
                </button>
              </div>
              <small>Обычно от 21 до 40 дней</small>
            </div>

            <div className="field-card">
              <span>Длина менструации</span>
              <div className="number-stepper">
                <button type="button" aria-label="Уменьшить длину менструации" onClick={() => adjustPeriodLength(-1)}>
                  -
                </button>
                <input
                  value={periodLength}
                  type="number"
                  min={2}
                  max={10}
                  onChange={(event) => setPeriodLength(Number(event.target.value))}
                  required
                />
                <button type="button" aria-label="Увеличить длину менструации" onClick={() => adjustPeriodLength(1)}>
                  +
                </button>
              </div>
              <small>Обычно от 2 до 10 дней</small>
            </div>
            {error && <p className="error-text">{error}</p>}
            {status && <p className="success-text">{status}</p>}
            <button className="save-button" type="submit" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить цикл'}
            </button>
          </form>
        )}
      </section>

      <section className="settings-section" aria-label="Настройки уведомлений">
        <div>
          <h2>Напоминания</h2>
          <p>Когда отправка будет подключена, бот сможет напоминать отметить самочувствие.</p>
        </div>

        {notificationsLoading ? (
          <p className="settings-note">Загружаем уведомления...</p>
        ) : (
          <form className="cycle-form" onSubmit={handleNotificationSubmit}>
            <div className="toggle-row">
              <span>
                <strong>{notificationsEnabled ? 'Уведомления включены' : 'Уведомления выключены'}</strong>
                <small>{notificationsEnabled ? 'Бот будет использовать время ниже для ежедневного напоминания.' : 'Нажмите кнопку, чтобы подготовить ежедневные напоминания.'}</small>
              </span>
              <button className="toggle-button" type="button" aria-pressed={notificationsEnabled} onClick={() => setNotificationsEnabled((value) => !value)}>
                {notificationsEnabled ? 'Выключить' : 'Включить'}
              </button>
            </div>

            <label className="field-card">
              <span>Время напоминания</span>
              <input
                value={notifyTime}
                type="time"
                onChange={(event) => setNotifyTime(event.target.value)}
                disabled={!notificationsEnabled}
                required
              />
            </label>

            <label className="field-card">
              <span>Часовой пояс</span>
              <input
                value={timezone}
                type="text"
                onChange={(event) => setTimezone(event.target.value)}
                disabled={!notificationsEnabled}
                required
              />
              <small>Например: Europe/Moscow</small>
            </label>

            {notificationError && <p className="error-text">{notificationError}</p>}
            {notificationStatus && <p className="success-text">{notificationStatus}</p>}
            <button className="save-button" type="submit" disabled={notificationsSaving}>
              {notificationsSaving ? 'Сохраняем...' : 'Сохранить напоминания'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

export default Settings
