import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// eslint-disable-next-line react/prop-types
export default function ProtectedRoute({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)

  if (!accessToken || !user) {
    return <Navigate to="/auth" replace />
  }

  return children
}
