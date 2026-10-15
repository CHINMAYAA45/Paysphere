import { createContext, useContext, useMemo, useState } from 'react'
import api, { AUTH_KEY } from '../api/client.js'

const AuthContext = createContext(null)

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.token || parsed.expiresAt < Date.now()) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth)

  const value = useMemo(
    () => ({
      auth,
      isAuthenticated: !!auth,
      async login(email, password) {
        const { data } = await api.post('/api/auth/login', { email, password })
        const next = {
          token: data.token,
          email: data.email,
          role: data.role,
          expiresAt: Date.now() + data.expiresInMs,
        }
        localStorage.setItem(AUTH_KEY, JSON.stringify(next))
        setAuth(next)
        return next
      },
      logout() {
        try {
          localStorage.removeItem(AUTH_KEY)
        } catch {
          // ignore
        }
        setAuth(null)
      },
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
