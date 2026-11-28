import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'

export const metadata: Metadata = {
  title: 'SportHub - FAQ',
}

export default async function Page() {
  return (
    <PageLayout title="Frequently Asked Questions">
      <section>
        <p>FAQ content will be implemented here.</p>
      </section>
    </PageLayout>
  )
}