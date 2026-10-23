import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'
import Button from '@ui/Button'
import { randomS3Image } from '@utils/images'
import { getWorldRecords, getWorldFirsts } from '@lib/data-services'
import WorldRecordsPageContent from './components/WorldRecordsPageContent'

export const metadata: Metadata = {
  title: 'SportHub - World Records',
}

export default async function Page() {
  const [worldRecords, worldFirsts] = await Promise.all([
    getWorldRecords(),
    getWorldFirsts(),
  ]);

  return (
    <PageLayout title="World Records" heroImage={randomS3Image('WORLD_RECORDS')}>
      <section className="p-4 sm:p-0 flex gap-3 flex-wrap items-center">
        <Button as="link" href="/world_records/claim" variant="primary">Claim a world record or first</Button>
        <Button as="link" href="/world_records/my-claims" variant="ghost">My claims</Button>
      </section>
      <section className="p-4 sm:p-0">
        <WorldRecordsPageContent worldRecords={worldRecords} worldFirsts={worldFirsts} />
      </section>
    </PageLayout>
  )
}