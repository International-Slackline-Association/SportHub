import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'

export const metadata: Metadata = {
  title: 'SportHub - Partners',
}

export default async function Page() {
  return (
    <PageLayout title="Partners/Members">
      <section className="p-4 sm:p-0">
        <p>ISA Members and Partners content will be implemented here.</p>
      </section>
    </PageLayout>
  )
}