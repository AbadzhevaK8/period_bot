import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { authTelegram } from '../api/client'

function Onboarding() {
  const [message, setMessage] = useState('Подключение...')
  const navigate = useNavigate()

  useEffect(() => {
    const initData = new URLSearchParams(window.location.search).get('initData') || ''

    if (!initData) {
      setMessage('Не удалось найти данные Telegram. Откройте приложение через Telegram.')
      return
    }

    try {
      if (WebApp?.ready) {
        WebApp.ready()
      }
      if (WebApp?.expand) {
        WebApp.expand()
      }
    } catch (error) {
      console.warn('Telegram WebApp unavailable', error)
    }

    authTelegram(initData)
      .then((result) => {
        localStorage.setItem('auth_token', result.token)
        setMessage('Авторизация прошла успешно. Перенаправление...')
        navigate('/calendar')
      })
      .catch(() => {
        setMessage('Ошибка авторизации. Попробуйте открыть Mini App снова.')
      })
  }, [])

  return (
    <div className="app-shell">
      <h1>Period Bot</h1>
      <p>{message}</p>
    </div>
  )
}

export default Onboarding
