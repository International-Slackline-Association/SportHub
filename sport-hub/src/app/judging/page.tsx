import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'
import { S3_IMAGES } from '@utils/consts'

export const metadata: Metadata = {
  title: 'SportHub - Judging',
}

export default async function Page() {
  return (
    <PageLayout title="Judging" heroImage={{ src: S3_IMAGES.judging, alt: 'Judging hero' }}>
      <section className="p-4 sm:p-0">
        <p>Judging content will be implemented here.</p>
      </section>
    </PageLayout>
  )
}