import { useEffect, useState } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import AuthPage from './AuthPage'
import ChatPage from './ChatPage'
import ProtectedRoute from './components/ProtectedRoute'
import { requestWithRefresh } from './lib/api'
import { useAuthStore } from './store/authStore'

export default function App() {
  const [loading, setLoading] = useState(true)
  const accessToken = useAuthStore((s) => s.accessToken)
  const theme = useAuthStore((s) => s.theme)
  const setUser = useAuthStore((s) => s.setUser)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      if (!accessToken) {
        if (active) setLoading(false)
        return
      }

      try {
        const res = await requestWithRefresh('/api/auth/me')
        if (!active) return
        setUser(res.data.user)
      } catch {
        if (active) clearAuth()
      } finally {
        if (active) setLoading(false)
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [accessToken, clearAuth, setUser])

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  if (loading) {
    return <div className="h-screen bg-[#111B21]" />
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/chat"
          element={(
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<Navigate to={accessToken ? '/chat' : '/auth'} replace />} />
      </Routes>
    </Router>
  )
}
