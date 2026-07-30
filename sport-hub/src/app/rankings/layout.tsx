import { Suspense } from 'react'
import Spinner from '@ui/Spinner'

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6"><Spinner /></div>}>
      {children}
    </Suspense>
  )
}
