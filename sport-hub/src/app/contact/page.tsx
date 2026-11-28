import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'

export const metadata: Metadata = {
  title: 'SportHub - Contact',
}

export default async function Page() {
  return (
    <PageLayout title="Contact">
      <section>
        <p>Contact information will be implemented here.</p>
      </section>
    </PageLayout>
  )
}