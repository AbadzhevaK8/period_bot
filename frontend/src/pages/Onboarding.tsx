import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { authTelegram } from '../api/client'

/**
 * Get Telegram initData from multiple sources.
 * Priority:
 *   1. sessionStorage (captured by App.tsx before React Router strips the URL)
 *   2. window.Telegram.WebApp.initData (native injection, works even after SPA nav)
 *   3. @twa-dev/sdk WebApp.initData
 *   4. URL tgWebAppData params
 */
function getTelegramInitData(): string {
  // 1. sessionStorage — captured by App.tsx before React Router strips hash/params
  const captured = sessionStorage.getItem('tg_init_data')
  if (captured && captured.length > 0) {
    console.log('Onboarding: got initData from sessionStorage')
    return captured
  }

  // 2. window.Telegram.WebApp (native injection)
  try {
    const tg = (window as any).Telegram?.WebApp
    const data = tg?.initData
    if (data && data.length > 0) {
      sessionStorage.setItem('tg_init_data', data) // cache for retries
      console.log('Onboarding: got initData from window.Telegram.WebApp.initData')
      return data
    }
  } catch {}

  // 3. @twa-dev/sdk
  try {
    if (WebApp?.initData && WebApp.initData.length > 0) {
      sessionStorage.setItem('tg_init_data', WebApp.initData) // cache for retries
      console.log('Onboarding: got initData from @twa-dev/sdk')
      return WebApp.initData
    }
  } catch {}

  // 4. URL params
  const searchParams = new URLSearchParams(window.location.search)
  const tgParam = searchParams.get('tgWebAppData')
  if (tgParam) {
    sessionStorage.setItem('tg_init_data', tgParam)
    console.log('Onboarding: got initData from ?tgWebAppData=')
    return tgParam
  }

  const hash = window.location.hash
  if (hash.startsWith('#')) {
    try {
      const hp = new URLSearchParams(hash.slice(1))
      const hashData = hp.get('tgWebAppData')
      if (hashData) {
        sessionStorage.setItem('tg_init_data', hashData)
        console.log('Onboarding: got initData from #tgWebAppData=')
        return hashData
      }
    } catch {}
  }

  return ''
}

function Onboarding() {
  const [message, setMessage] = useState('Подключение...')
  const [botUsername, setBotUsername] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let mounted = true
    let attempts = 0
    const maxAttempts = 30

    const auth = (initData: string) => {
      authTelegram(initData)
        .then((result) => {
          if (!mounted) return
          console.log('Telegram auth succeeded', { user: result.user })
          localStorage.setItem('auth_token', result.token)
          setMessage('Авторизация прошла успешно. Перенаправление...')
          navigate('/calendar')
        })
        .catch((error) => {
          if (!mounted) return
          console.error('Telegram auth failed', error)
          const msg = String(error)
          if (msg.includes('401')) {
            setMessage('Ошибка авторизации Telegram. initData не прошла проверку на сервере.')
          } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            setMessage('Ошибка сети: не удалось связаться с сервером.')
          } else {
            setMessage(`Ошибка авторизации (${msg.slice(0, 100)}).`)
          }
        })
    }

    const tryAuth = () => {
      attempts += 1

      // Initialize Telegram Mini App
      try {
        WebApp?.ready?.()
        WebApp?.expand?.()
      } catch {}

      const initData = getTelegramInitData()

      if (initData) {
        console.log(`Onboarding: auth attempt ${attempts}, initData length=${initData.length}`)
        auth(initData)
        return
      }

      if (attempts < maxAttempts) {
        setMessage('Подключаем Telegram...')
        window.setTimeout(tryAuth, 200)
        return
      }

      if (!mounted) return

      console.error('Onboarding: initData not found after retries')
      setMessage('Не удалось найти данные Telegram. Откройте приложение через Telegram.')

      const tg = (window as any).Telegram?.WebApp
      const initDataUnsafe = tg?.initDataUnsafe || {}

      setDebugInfo({
        href: window.location.href,
        search: window.location.search,
        hash: window.location.hash,
        pathname: location.pathname,
        sessionStorageInitData: (sessionStorage.getItem('tg_init_data') || '').slice(0, 50),
        hasTelegramGlobal: !!(window as any).Telegram,
        hasWebApp: !!tg,
        tgInitDataExists: !!(tg?.initData),
        tgInitDataType: typeof tg?.initData,
        tgInitDataLength: (tg?.initData || '').length,
        tgInitDataStart: (tg?.initData || '').slice(0, 50),
        // DEBUG: whats in initDataUnsafe?
        initDataUnsafeKeys: Object.keys(initDataUnsafe),
        initDataUnsafeQueryId: (initDataUnsafe.query_id || '').slice(0, 20),
        initDataUnsafeHash: (initDataUnsafe.hash || '').slice(0, 20),
        initDataUnsafeUser: initDataUnsafe.user ? JSON.stringify(initDataUnsafe.user).slice(0, 100) : null,
        initDataUnsafeAuthDate: initDataUnsafe.auth_date,
        initDataUnsafeChatType: initDataUnsafe.chat_type,
        initDataUnsafeChatInstance: initDataUnsafe.chat_instance,
        initDataUnsafeStartParam: initDataUnsafe.start_param,
        platform: tg?.platform,
        colorScheme: tg?.colorScheme,
        version: tg?.version,
        // SDK
        sdkInitDataExists: !!(WebApp?.initData),
        sdkInitDataLength: (WebApp?.initData || '').length,
        sdkInitDataStart: (WebApp?.initData || '').slice(0, 50),
        sdkVersion: WebApp?.version,
      })

      fetch('/api/bot/me')
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return
          if (data && data.username) setBotUsername(data.username)
        })
        .catch(() => {})
    }

    tryAuth()

    return () => {
      mounted = false
    }
  }, [navigate, location.pathname])

  return (
    <div className="app-shell">
      <h1>Period Bot</h1>
      <p>{message}</p>

      {/* Fallback banner when initData is missing */}
      {message.includes('Не удалось найти данные Telegram') && (
        <div style={{ marginTop: 18, padding: 16, borderRadius: 10, background: '#0b1220', color: '#c9d1d9' }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Не получены данные Telegram</h3>
          <p style={{ margin: '0 0 12px 0', color: '#9aa4ad' }}>
            Telegram открыл страницу как обычный браузер, а не как Mini App. Закройте это окно, вернитесь в чат
            @garum_period_bot, отправьте /start и нажмите кнопку «Открыть приложение» в сообщении бота.
          </p>
        </div>
      )}

      {botUsername && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          {message.includes('не удалось') && (
            <div style={{ marginTop: 12 }}>
              <a
                href="/period/debug.html"
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: '#21262d',
                  color: '#58a6ff',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  border: '1px solid #30363d',
                }}
              >
              Debug страница
              </a>
              <p style={{ marginTop: 8, fontSize: '0.8rem', color: '#8b949e' }}>
                Platform: tdesktop | initData: пусто
              </p>
              <p style={{ fontSize: '0.8rem', color: '#484f58' }}>
                Попробуйте открыть Mini App в Telegram Web или на телефоне
              </p>
            </div>
          )}
        </div>
      )}

      {debugInfo && (
        <details style={{ marginTop: 20, fontSize: 11, color: '#666' }}>
          <summary>Debug info</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

export default Onboarding
