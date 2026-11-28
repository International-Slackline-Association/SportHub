import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'
import { randomS3Image } from '@utils/images'

export const metadata: Metadata = {
  title: 'SportHub - Judging',
}

export default async function Page() {
  return (
    <PageLayout title="Judging" heroImage={randomS3Image('JUDGING')}>
      <section>
        <p>Judging content under development.</p>
      </section>
    </PageLayout>
  )
}