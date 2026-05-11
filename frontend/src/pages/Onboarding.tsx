import { useEffect, useState } from 'react'
import { WebApp } from '@twa-dev/sdk'
import { authTelegram } from '../api/client'

function Onboarding() {
  const [message, setMessage] = useState('Подключение...')

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()

    const initData = new URLSearchParams(window.location.search).get('initData') || ''
    if (!initData) {
      setMessage('Не удалось найти данные Telegram. Откройте приложение снова.')
      return
    }

    authTelegram(initData)
      .then((result) => {
        localStorage.setItem('auth_token', result.token)
        setMessage('Авторизация прошла успешно. Перенаправление...')
        window.location.href = '/calendar'
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
