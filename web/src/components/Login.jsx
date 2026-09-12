import { useState } from 'react'
import { navigate } from '../router.js'
import { useAuth } from '../context/AuthContext.jsx'
import AuthLayout from './AuthLayout.jsx'
import { AuthField, AuthPasswordField, AuthSubmit } from './AuthFields.jsx'
import { Icon } from './Icons.jsx'

// Pre-filled demo credentials — the seeded ops-lead account.
const DEMO = { email: 'itumeleng.k@new-mutual.co.za', password: 'OperatorSecretToken#2026' }

export default function Login() {
  const { login } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const form = new FormData(e.currentTarget)
      await login(form.get('email'), form.get('password'))
      // No navigate() here: SignedOutOnly sees the new session and sends the
      // user to ?next= (or the dashboard). One component owns the redirect.
    } catch (err) {
      setError(err.message || 'Sign-in failed')
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-700/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Sign In to Platform</h2>
          <p className="text-xs text-slate-400 mt-1">Access claims adjudication, policy lookup, and financial telemetry.</p>
        </div>
        <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 flex items-center shadow-inner shrink-0">
          <span className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow">Sign In</span>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all duration-150"
          >
            Register
          </button>
        </div>
      </div>

      {/* Fast single sign-on */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button type="button" className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600 text-xs font-semibold text-slate-200 transition">
          <Icon name="domain" size={16} className="text-blue-400" />
          New-Mutual SSO
        </button>
        <button type="button" className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600 text-xs font-semibold text-slate-200 transition">
          <Icon name="key" size={16} className="text-blue-400" />
          Sign in with Google
        </button>
      </div>

      <div className="relative flex items-center justify-center my-2 mb-6">
        <div className="border-t border-slate-700/80 w-full" />
        <span className="bg-[#0F172A] px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Or Continue with Credentials</span>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200">
            <Icon name="error" size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <AuthField
          label="Work Email Address *" id="email" icon="mail" name="email"
          type="email" placeholder="name@new-mutual.co.za" defaultValue={DEMO.email} required
        />
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-slate-300">Password *</label>
            <a href="#" className="text-xs font-medium text-blue-400 hover:text-blue-300 transition">Forgot password?</a>
          </div>
          <AuthPasswordField id="password" name="password" placeholder="••••••••••••" defaultValue={DEMO.password} required />
        </div>

        <div className="flex items-center justify-between text-xs py-1">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900" />
            <span>Keep session active for 8 hours</span>
          </label>
          <span className="text-slate-500 text-[11px]">Hardware 2FA required next</span>
        </div>

        <AuthSubmit busy={busy}>
          {busy ? (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-200 animate-pulse" />
              Establishing secure session…
            </>
          ) : (
            <>
              Sign In to New-Mutual Portal
              <Icon name="arrow_forward" size={16} />
            </>
          )}
        </AuthSubmit>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
        <span>Need to onboard an assessor or employee?</span>
        <button
          onClick={() => navigate('/register')}
          className="ml-1.5 font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
        >
          Request Platform Registration
        </button>
      </div>
    </AuthLayout>
  )
}
