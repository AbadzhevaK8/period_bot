import { Navigate, Route, Routes } from 'react-router-dom'
import Calendar from './pages/Calendar'
import Onboarding from './pages/Onboarding'

function App() {
  const token = localStorage.getItem('auth_token')

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/calendar" replace /> : <Navigate to="/onboarding" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/calendar" element={<Calendar />} />
    </Routes>
  )
}

export default App
