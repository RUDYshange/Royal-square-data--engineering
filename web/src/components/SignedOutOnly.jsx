import { Navigate } from '../router-helpers.js'
import { useAuth } from '../context/AuthContext.jsx'

// Wraps /login and /register: signed-in users have no business on these
// pages. The gate — not the form — owns the redirect, so ?next= is honored
// no matter how the session was established (form, SSO, restored token).
export default function SignedOutOnly({ children }) {
  const { user, booting } = useAuth()
  if (booting) return null
  if (user) {
    const next = new URLSearchParams(window.location.search).get('next')
    return <Navigate to={next && next.startsWith('/') ? next : '/'} replace />
  }
  return children
}
