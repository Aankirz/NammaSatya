'use client'

import { useState } from 'react'
import type { AppView } from '@/types'
import TopBar    from '@/components/TopBar'
import CheckView from '@/components/CheckView'
import Dashboard from '@/components/Dashboard'

export default function Page() {
  const [view, setView] = useState<AppView>('check')

  return (
    <>
      <TopBar view={view} onViewChange={setView} />
      {view === 'check'     && <CheckView />}
      {view === 'dashboard' && <Dashboard />}
    </>
  )
}
