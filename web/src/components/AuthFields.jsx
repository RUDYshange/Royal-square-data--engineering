import { useState } from 'react'
import { Icon } from './Icons.jsx'

const FIELD =
  'w-full py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-slate-100 ' +
  'placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition'

// Text field with a leading Material icon.
export function AuthField({ label, icon, id, name, mono = false, right = null, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        <span className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 ${mono ? 'text-xs font-mono' : ''}`}>
          {mono ? 'ID' : <Icon name={icon} size={16} />}
        </span>
        <input id={id} name={name ?? id} className={`${FIELD} ${mono ? 'font-mono' : ''} ${right ? 'pr-10' : 'pr-3'} pl-9`} {...props} />
        {right}
      </div>
    </div>
  )
}

// Password field with a show/hide toggle.
export function AuthPasswordField({ label = 'Password *', id = 'password', name, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <AuthField
      label={label} id={id} name={name ?? id} icon="lock"
      type={show ? 'text' : 'password'}
      right={
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <Icon name={show ? 'visibility_off' : 'visibility'} size={16} />
        </button>
      }
      {...props}
    />
  )
}

// Select field for jurisdiction / role picks.
export function AuthSelect({ label, id, options }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-300 mb-1.5">{label}</label>
      <select id={id} className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// Gradient submit button shared by both auth pages.
export function AuthSubmit({ children, busy = false }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition duration-150 active:scale-[0.99] mt-2 disabled:opacity-80"
    >
      {children}
    </button>
  )
}
