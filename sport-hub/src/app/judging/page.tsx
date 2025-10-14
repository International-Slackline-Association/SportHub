import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'

export const metadata: Metadata = {
  title: 'SportHub - Judging',
}

export default async function Page() {
  return (
    <PageLayout title="Judging">
      <section className="p-4 sm:p-0">
        <p>Judging content will be implemented here.</p>
      </section>
    </PageLayout>
  )
}