import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  const hasToken = !!sessionStorage.getItem('token')

  if (!isAuthenticated || !hasToken) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute














