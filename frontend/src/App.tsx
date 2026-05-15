import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import Calendar from './pages/Calendar'
import Onboarding from './pages/Onboarding'
import Settings from './pages/Settings'

/**
 * Capture initData from the raw URL BEFORE any React Router processing.
 * This is critical because:
 * 1. Telegram passes data via hash/query params
 * 2. React Router's Navigate with replace can strip the hash
 * 3. We save it to sessionStorage so Onboarding can find it
 */
function captureInitData(): string {
  // Try window.Telegram.WebApp first (native injection)
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.initData && tg.initData.length > 0) {
      sessionStorage.setItem('tg_init_data', tg.initData)
      return tg.initData
    }
  } catch {}

  // Try URL hash for tgWebAppData
  const hash = window.location.hash
  if (hash.startsWith('#')) {
    try {
      const hp = new URLSearchParams(hash.slice(1))
      const d = hp.get('tgWebAppData')
      if (d) {
        sessionStorage.setItem('tg_init_data', d)
        return d
      }
    } catch {}
  }

  // Try URL search params
  const search = window.location.search
  if (search) {
    const sp = new URLSearchParams(search)
    const d = sp.get('tgWebAppData')
    if (d) {
      sessionStorage.setItem('tg_init_data', d)
      return d
    }
  }

  return ''
}

function App() {
  const [initDataCaptured, setInitDataCaptured] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const theme = localStorage.getItem('period_theme') || '1'
    document.documentElement.dataset.theme = /^(?:[1-9]|1[0-6])$/.test(theme) ? theme : '1'
  }, [])

  // Capture initData on first mount, before any routing
  useEffect(() => {
    if (!initDataCaptured) {
      const data = captureInitData()
      console.log('App: captureInitData result', {
        captured: !!data,
        length: data?.length || 0,
      })
      setInitDataCaptured(true)
    }
  }, [initDataCaptured])

  const token = localStorage.getItem('auth_token')

  const hasInitData = !!(
    sessionStorage.getItem('tg_init_data') ||
    (window as any).Telegram?.WebApp?.initData
  )

  console.log('App render', {
    token: !!token,
    pathname: location.pathname,
    hasInitData,
    hash: window.location.hash,
    search: window.location.search,
  })

  useEffect(() => {
    const backButton = WebApp?.BackButton
    if (!backButton) return

    const handleBack = () => navigate('/calendar')

    try {
      if (token && location.pathname === '/settings') {
        backButton.show()
        backButton.onClick(handleBack)
      } else {
        backButton.offClick(handleBack)
        backButton.hide()
      }
    } catch {}

    return () => {
      try {
        backButton.offClick(handleBack)
      } catch {}
    }
  }, [location.pathname, navigate, token])

  const showNavigation = !!token && location.pathname !== '/onboarding'

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            token ? (
              <Navigate to="/calendar" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="/index.html"
          element={<Navigate to="/onboarding" replace />}
        />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="*"
          element={
            token ? (
              <Navigate to="/calendar" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
      </Routes>

      {showNavigation && (
        <nav className="app-nav" aria-label="Основная навигация">
          <NavLink to="/calendar">Календарь</NavLink>
          <NavLink to="/settings">Настройки</NavLink>
        </nav>
      )}
    </>
  )
}

export default App
