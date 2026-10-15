import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Only lets logged-in users in. Optionally restrict to certain roles:
// <ProtectedRoute roles={['ADMIN', 'HR']}>...</ProtectedRoute>
export default function ProtectedRoute({ roles, children }) {
  const { auth, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(auth.role)) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-red-600">Access denied</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your role ({auth.role}) is not allowed to open this page.
        </p>
      </div>
    )
  }

  return children
}
