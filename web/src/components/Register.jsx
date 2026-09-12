import { useState } from 'react'
import { navigate } from '../router.js'
import AuthLayout from './AuthLayout.jsx'
import { AuthField, AuthPasswordField, AuthSelect, AuthSubmit } from './AuthFields.jsx'
import { Icon } from './Icons.jsx'

const JURISDICTIONS = [
  { value: 'jhb',  label: 'Gauteng — JHB Head Office' },
  { value: 'cpt',  label: 'Western Cape — CPT Regional' },
  { value: 'dbn',  label: 'KwaZulu-Natal — DBN Branch' },
  { value: 'intl', label: 'National / Remote Operations' },
]

const ROLES = [
  { value: 'assessor', label: 'Claims Assessor (Standard)' },
  { value: 'senior',   label: 'Senior Assessor (R75k sign-off)' },
  { value: 'lead',     label: 'Operations Lead' },
  { value: 'batch',    label: 'Batch / DevOps Engineer' },
]

export default function Register() {
  const [submitted, setSubmitted] = useState(false)
  const [consent, setConsent] = useState(true)

  function submit(e) {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => navigate('/login'), 1400)
  }

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-700/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Register for New-Mutual Access</h2>
          <p className="text-xs text-slate-400 mt-1">Request operator credentials for underwriting, claims, or batch jobs.</p>
        </div>
        <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 flex items-center shadow-inner shrink-0">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all duration-150"
          >
            Sign In
          </button>
          <span className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow">Register</span>
        </div>
      </div>

      {submitted ? (
        /* Post-submission confirmation state */
        <div className="flex flex-col items-center text-center py-10 gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
            <Icon name="mark_email_read" size={28} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Request submitted</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
              Your operator registration is pending supervisor sign-off. A provisioning
              link will be sent to your work email once approved by Security Operations.
            </p>
          </div>
          <div className="text-code-sm font-mono text-slate-500 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
            TICKET: SOC-REG-2026-0911 • SLA: &lt; 24h
          </div>
          <button
            onClick={() => navigate('/login')}
            className="mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <>
          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthField label="Full Name *" id="fullname" icon="person" placeholder="e.g. Kgothatso Baloyi" />
            <AuthField label="Employee ID / RSA ID *" id="empid" mono placeholder="NM-91402 or RSA ID" />
          </div>

          {/* Office & role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AuthSelect label="Office Jurisdiction *" id="jurisdiction" options={JURISDICTIONS} />
            <AuthSelect label="Requested Role *" id="role" options={ROLES} />
          </div>

          {/* Credentials */}
          <AuthField
            label="Work Email Address *" id="reg-email" icon="mail"
            type="email" placeholder="name@new-mutual.co.za"
          />
          <AuthPasswordField id="reg-password" placeholder="Choose a strong password" />

          {/* Compliance */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox" checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="w-4 h-4 rounded mt-0.5 bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="leading-relaxed">
                I consent to FAIS &amp; POPIA operator auditing under New-Mutual Governance Policy.
                Accounts require supervisor sign-off before claim access is granted.
              </span>
            </label>
          </div>

          <AuthSubmit busy={submitted} >
            {submitted ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-200 animate-pulse" />
                Submitting request…
              </>
            ) : (
              <>
                Submit Operator Registration Request
                <Icon name="person_add" size={16} />
              </>
            )}
          </AuthSubmit>
        </>
      )}

      <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
        <span>Already have verified platform credentials?</span>
        <button
          onClick={() => navigate('/login')}
          className="ml-1.5 font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
        >
          Sign In here
        </button>
      </div>
    </AuthLayout>
  )
}
