import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, session } from '../api.js'

// Session state for the whole app. On mount it validates any stored token
// against /auth/me (the token is the source of truth, not localStorage
// alone — a revoked or expired session is caught here on first load).
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)   // validating stored token

  useEffect(() => {
    let cancelled = false
    if (!session.get()) { setBooting(false); return }
    api.me()
      .then(res => { if (!cancelled) setUser(res.user) })
      .catch(() => { if (!cancelled) session.clear() })
      .finally(() => { if (!cancelled) setBooting(false) })
    return () => { cancelled = true }
  }, [])

  const value = useMemo(() => ({
    user,
    booting,
    async login(email, password) {
      const res = await api.login(email, password)
      session.set(res.access_token)
      setUser(res.user)
      return res.user
    },
    logout() {
      session.clear()
      setUser(null)
    },
  }), [user, booting])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
