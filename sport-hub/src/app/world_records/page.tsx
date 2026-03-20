import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'
import { S3_IMAGES } from '@utils/consts'

export const metadata: Metadata = {
  title: 'SportHub - World Records',
}

export default async function Page() {
  return (
    <PageLayout title="World Records" heroImage={{ src: S3_IMAGES.worldRecords, alt: 'World Records hero' }}>
      <section className="p-4 sm:p-0">
        <p>World Records content will be implemented here.</p>
      </section>
    </PageLayout>
  )
}