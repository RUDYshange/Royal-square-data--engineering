import { Navigate, usePath } from '../router-helpers.js'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Gates app routes behind a valid session.
 * - While the stored token is being validated: full-screen boot splash
 *   (prevents a flash of the login page on every reload).
 * - No session: redirect to /login, remembering where the user wanted to
 *   go so sign-in can return them there.
 */
export default function RequireAuth({ children }) {
  const { user, booting } = useAuth()
  const path = usePath()

  if (booting) {
    return (
      <div className="min-h-screen bg-spruce flex flex-col items-center justify-center gap-4 text-slate-300">
        <span className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-code-sm font-mono uppercase tracking-wider">Establishing secure session…</span>
      </div>
    )
  }

  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(path)}`} replace />
  return children
}
