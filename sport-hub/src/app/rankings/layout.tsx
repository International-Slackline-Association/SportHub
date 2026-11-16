import { Suspense } from 'react'
import { Spinner } from '@slacklineinternational/onsight/react'

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 flex items-center gap-3"><Spinner label="Loading rankings" /><p>Loading rankings…</p></div>}>
      {children}
    </Suspense>
  )
}
