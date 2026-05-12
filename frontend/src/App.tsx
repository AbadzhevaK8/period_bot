import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Calendar from './pages/Calendar'
import Onboarding from './pages/Onboarding'

function App() {
  const token = localStorage.getItem('auth_token')
  const location = useLocation()

  return (
    <Routes>
      <Route
        path="/"
        element={
          token ? (
            <Navigate to="/calendar" replace />
          ) : (
            <Navigate to={`/onboarding${location.search}`} replace />
          )
        }
      />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/calendar" element={<Calendar />} />
    </Routes>
  )
}

export default App
