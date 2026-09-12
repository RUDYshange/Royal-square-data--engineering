import { Icon } from './Icons.jsx'

// Shared shell for the auth pages, ported from the New-Mutual auth mock:
// system status bar, brand/security panel, and the operational footer.
// The right-hand column (the form) is supplied by the page.
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-spruce text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Top system bar */}
      <header className="w-full border-b border-slate-800/80 bg-[#0A0A0A]/90 backdrop-blur px-6 py-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-medium text-slate-300">
              Identity &amp; Auth Cluster: <span className="text-blue-400 font-mono">auth-af-south-1</span>
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="font-mono text-slate-400 hidden sm:inline">FAIS &amp; POPIA Compliant FIDO2 / OIDC</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:flex items-center gap-1.5">
            <Icon name="shield" size={14} className="text-blue-400" />
            TLS 1.3 / HSM Secured
          </span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="text-slate-400">Version <span className="font-mono text-slate-300">v1.0.0-prod</span></span>
        </div>
      </header>

      {/* Main container */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-5xl bg-[#111827] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
          {/* Left panel: brand & platform context */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0F172A] via-[#0A0A0A] to-[#050505] p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 relative">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1D4ED8] to-[#3B82F6] flex items-center justify-center shadow-lg shadow-blue-950/40 border border-blue-400/30">
                  <Icon name="shield_with_house" size={22} className="text-blue-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tight text-white">New-Mutual</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Enterprise</span>
                  </div>
                  <p className="text-xs text-slate-400 tracking-wide font-medium">Financial Operations &amp; Underwriting Platform</p>
                </div>
              </div>

              <div className="pt-2 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon name="fingerprint" size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Zero-Trust Enterprise Auth</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Integrated with RSA National Directory SAML 2.0 and Azure AD with hardware token enforcement.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon name="balance" size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Regulatory Adjudication</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Immutable cryptographic audit trail for claims approvals, assessor mandates, and batch payment dispatch.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/30 to-blue-950/20 border border-blue-800/30">
                <p className="text-xs text-slate-300 italic leading-relaxed">"Mandatory session rotation occurs every 8 hours. Ensure your FIDO2 passkey or Microsoft Authenticator is registered."</p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Security Operations Center</span>
                  <span className="text-blue-400 font-mono font-medium">SOC-2 Type II</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>© 2026 New-Mutual Ltd.</span>
              <div className="flex items-center gap-3">
                <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
                <span>•</span>
                <a href="#" className="hover:text-slate-300 transition-colors">FAIS Rules</a>
                <span>•</span>
                <a href="#" className="hover:text-slate-300 transition-colors">Support</a>
              </div>
            </div>
          </div>

          {/* Right panel: page-supplied form */}
          <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center bg-[#0F172A]">
            {children}
          </div>
        </div>
      </main>

      {/* Bottom global status strip */}
      <footer className="w-full border-t border-slate-800/80 bg-[#0A0A0A]/90 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>Operational Nodes: <span className="text-slate-300 font-mono">prod-za-jnb-01, prod-za-cpt-02</span></span>
          <span>•</span>
          <span>Gateway Latency: <span className="text-blue-400 font-mono">11ms</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="lock" size={12} className="text-blue-500" />
          <span className="text-slate-400">Authorized Personnel Only • Unlawful access is monitored under South African Law</span>
        </div>
      </footer>
    </div>
  )
}
