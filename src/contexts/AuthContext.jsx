import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import Api from '../api/api.jsx'

const TOKEN_KEY = 'ks-token'
const TOKEN_EXPIRY_KEY = 'ks-token-expiry'

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

function setStoredToken(token, remember = false) {
  clearStoredToken()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
  if (remember) {
    // Optional: store expiry if backend sends it
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry)
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await Api.get('/auth/me')
      if (data?.status === 'success' && data?.data) {
        setUser(data.data)
      } else {
        clearStoredToken()
        setUser(null)
      }
    } catch (err) {
      if (err.response?.status === 401) {
        clearStoredToken()
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = useCallback(async (credentials, remember = false) => {
    const { data } = await Api.post('/auth/login', { data: credentials })
    if (data?.status === 'success' && data?.token) {
      setStoredToken(data.token, remember)
      await fetchUser()
      return { success: true }
    }
    return { success: false, message: data?.message || 'Login failed' }
  }, [fetchUser])

  const register = useCallback(async (payload) => {
    const body = {
      ...payload,
      role: payload.role || 'customer',
    }
    const res = await Api.post('/auth/register', { data: body })
    return res.data
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setUser(null)
  }, [])

  const isOnboardingComplete =
    user?.is_onboarding_complete === 1 || user?.is_onboarding_complete === true

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isOnboardingComplete: !!user && isOnboardingComplete,
    login,
    register,
    logout,
    refreshUser: fetchUser,
    setStoredToken,
    getStoredToken,
    clearStoredToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
