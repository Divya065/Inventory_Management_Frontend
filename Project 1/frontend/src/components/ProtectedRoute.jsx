import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, superAdminOnly = false, requireActivePlan = true }) => {
  const { isAuthenticated, isSuperAdmin, hasActivePlan, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  const hasToken = !!sessionStorage.getItem('token')

  if (!isAuthenticated || !hasToken) {
    return <Navigate to="/login" replace />
  }

  if (superAdminOnly) {
    if (!isSuperAdmin) {
      return <Navigate to="/" replace />
    }
    return children
  }

  if (isSuperAdmin) {
    return <Navigate to="/super-admin" replace />
  }

  if (requireActivePlan && !hasActivePlan) {
    return <Navigate to="/plans" replace />
  }

  return children
}

export default ProtectedRoute
