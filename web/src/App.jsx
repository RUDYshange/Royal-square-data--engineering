import { usePath } from './router.js'
import { AuthProvider } from './context/AuthContext.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import SignedOutOnly from './components/SignedOutOnly.jsx'
import Shell from './components/Shell.jsx'
import Login     from './components/Login.jsx'
import Register  from './components/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Claims    from './pages/Claims.jsx'
import Clients   from './pages/Clients.jsx'
import UserAccess from './pages/UserAccess.jsx'
import Performance from './pages/Performance.jsx'
import Status    from './pages/Status.jsx'

// Route table — one address per page. Auth pages render without the
// operations chrome; every app route is wrapped in the Shell (sidebar,
// topbar, shared polling).
const ROUTES = {
  '/':            { page: Dashboard, shell: true },
  '/claims':      { page: Claims,    shell: true },
  // /policyholders, not /clients — the API's GET /clients route would
  // shadow the page on document loads and answer the browser with 401 JSON.
  '/policyholders': { page: Clients, shell: true },
  // /access, not /users — the API's GET /users route would shadow the page
  // on document loads and answer the browser with 401 JSON.
  '/access':      { page: UserAccess, shell: true },
  '/performance': { page: Performance, shell: true },
  '/status':      { page: Status,    shell: true },
  '/login':       { page: Login,     shell: false },
  '/register':    { page: Register,  shell: false },
}

export default function App() {
  return (
    <AuthProvider>
      <Routed />
    </AuthProvider>
  )
}

function Routed() {
  const path = usePath()
  const route = ROUTES[path] ?? ROUTES['/']
  const Page = route.page

  // Auth pages are reachable only while signed out; signed-in users land
  // on the dashboard instead of seeing a login form they don't need.
  if (!route.shell) {
    return <Gate><Page /></Gate>
  }

  return (
    <RequireAuth>
      <Shell path={path}><Page /></Shell>
    </RequireAuth>
  )
}

// Keeps auth pages and app pages as siblings without breaking hook order:
// the gate logic lives in tiny leaf components, not in this switch.
function Gate({ children }) {
  return <SignedOutOnly>{children}</SignedOutOnly>
}
