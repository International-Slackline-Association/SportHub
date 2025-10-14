import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'

export const metadata: Metadata = {
  title: 'SportHub - Contact',
}

export default async function Page() {
  return (
    <PageLayout title="Contact">
      <section className="p-4 sm:p-0">
        <p>Contact information will be implemented here.</p>
      </section>
    </PageLayout>
  )
}