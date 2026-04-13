import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'
import { randomS3Image } from '@utils/consts'
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
    <PageLayout title="World Records" heroImage={{ src: randomS3Image('WORLD_RECORDS'), alt: 'World Records hero' }}>
      <section className="p-4 sm:p-0">
        <WorldRecordsPageContent worldRecords={worldRecords} worldFirsts={worldFirsts} />
      </section>
    </PageLayout>
  )
}