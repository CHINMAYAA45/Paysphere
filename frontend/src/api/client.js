import axios from 'axios'

export const AUTH_KEY = 'paysphere_auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
})

// Attach the JWT to every request automatically.
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) {
      const { token } = JSON.parse(raw)
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // ignore broken storage
  }
  return config
})

// If the server says the token is invalid or expired, log the user out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && !url.includes('/api/auth/login')) {
      try {
        localStorage.removeItem(AUTH_KEY)
      } catch {
        // ignore
      }
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
