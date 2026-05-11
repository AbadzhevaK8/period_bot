import { useEffect, useState } from 'react'

function Calendar() {
  const [message, setMessage] = useState('Загрузка календаря...')

  useEffect(() => {
    setTimeout(() => {
      setMessage('Календарь будет доступен после настройки API и авторизации.')
    }, 200)
  }, [])

  return (
    <div className="app-shell">
      <h1>Календарь цикла</h1>
      <p>{message}</p>
    </div>
  )
}

export default Calendar
