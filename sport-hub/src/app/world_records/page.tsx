import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'

export const metadata: Metadata = {
  title: 'SportHub - World Records',
}

export default async function Page() {
  return (
    <PageLayout title="World Records">
      <section className="p-4 sm:p-0">
        <p>World Records content will be implemented here.</p>
      </section>
    </PageLayout>
  )
}