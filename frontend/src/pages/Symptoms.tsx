import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getInsights, getSymptom, Pattern, saveSymptom } from '../api/client'

const moodOptions = [
  { value: 'calm', label: 'Спокойно' },
  { value: 'happy', label: 'Радостно' },
  { value: 'irritable', label: 'Раздражение' },
  { value: 'anxious', label: 'Тревожно' },
  { value: 'sad', label: 'Грустно' },
]

const bodyOptions = [
  { value: 'cramps', label: 'Спазмы' },
  { value: 'bloating', label: 'Вздутие' },
  { value: 'headache', label: 'Голова' },
  { value: 'breast_tenderness', label: 'Грудь' },
  { value: 'back_pain', label: 'Спина' },
]

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function Symptoms() {
  const { date = '' } = useParams()
  const navigate = useNavigate()
  const [energy, setEnergy] = useState(3)
  const [mood, setMood] = useState<string[]>([])
  const [body, setBody] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasExistingLog, setHasExistingLog] = useState(false)
  const [message, setMessage] = useState('')
  const [insight, setInsight] = useState<Pattern | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getSymptom(date)
      .then((log) => {
        if (!mounted) return
        setEnergy(log.energy)
        setMood(log.mood || [])
        setBody(log.body || [])
        setNote(log.note || '')
        setHasExistingLog(true)
      })
      .catch((err) => {
        if (!mounted) return
        if ((err as any).status === 401) {
          localStorage.removeItem('auth_token')
          navigate('/onboarding', { replace: true })
          return
        }
        setHasExistingLog(false)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [date, navigate])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setInsight(null)
    try {
      await saveSymptom({ date, energy, mood, body, note })
      setHasExistingLog(true)
      setMessage('Записано')
      const insights = await getInsights()
      setInsight(insights[0] || null)
    } catch {
      setMessage('Не удалось сохранить отметку.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <h1>Самочувствие</h1>
        <p>Загружаем отметку...</p>
      </div>
    )
  }

  return (
    <div className="app-shell symptoms-shell">
      <div className="page-header">
        <h1>Самочувствие</h1>
        <p>{new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
      </div>

      <form className="symptoms-form" onSubmit={handleSubmit}>
        <section className="symptom-section">
          <h2>Энергия</h2>
          <div className="energy-picker" role="radiogroup" aria-label="Энергия">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={energy === value ? 'active' : ''}
                aria-pressed={energy === value}
                onClick={() => setEnergy(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section className="symptom-section">
          <h2>Настроение</h2>
          <div className="chip-grid">
            {moodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={mood.includes(option.value) ? 'active' : ''}
                aria-pressed={mood.includes(option.value)}
                onClick={() => setMood((values) => toggleValue(values, option.value))}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="symptom-section">
          <h2>Тело</h2>
          <div className="chip-grid">
            {bodyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={body.includes(option.value) ? 'active' : ''}
                aria-pressed={body.includes(option.value)}
                onClick={() => setBody((values) => toggleValue(values, option.value))}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <label className="note-field">
          Заметка
          <textarea value={note} rows={4} maxLength={1000} onChange={(event) => setNote(event.target.value)} />
        </label>

        {message && <p className={message === 'Записано' ? 'success-text' : 'error-text'}>{message}</p>}
        {insight && <div className="insight-banner">{insight.message}</div>}

        <button type="submit" disabled={saving}>
          {saving ? 'Сохраняем...' : hasExistingLog ? 'Изменить' : 'Сохранить'}
        </button>
      </form>
    </div>
  )
}

export default Symptoms
