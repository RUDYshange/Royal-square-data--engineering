import { useState } from 'react'
import { LiveProvider, useLive } from '../context/LiveContext.jsx'
import Nav from './Nav.jsx'
import Topbar from './Topbar.jsx'

// Shared chrome for every operations route: polling context, sidebar,
// topbar. Pages render into <main> below the header.
function ShellInner({ path, children }) {
  const [spin, setSpin] = useState(false)
  const { openCount, streamAge, refreshAll, pipeline } = useLive()

  async function onRefresh() {
    setSpin(true)
    await refreshAll()
    setTimeout(() => setSpin(false), 600)
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Nav path={path} openCount={pipeline.error ? null : openCount} />
      <div className="pl-64 flex flex-col min-h-screen">
        <Topbar
          onRefresh={onRefresh}
          spinning={spin}
          streamAge={streamAge}
          healthError={null}
        />
        <main className="flex-1 px-gutter-desktop py-space-lg">{children}</main>
      </div>
    </div>
  )
}

export default function Shell({ path, children }) {
  return (
    <LiveProvider>
      <ShellInner path={path}>{children}</ShellInner>
    </LiveProvider>
  )
}
