import type { Metadata } from 'next'
import PageLayout from '@ui/PageLayout'
import { S3_IMAGES } from '@utils/consts'
import { getWorldRecords } from '@lib/data-services'
import WorldRecordsTable from './components/WorldRecordsTable'

export const metadata: Metadata = {
  title: 'SportHub - World Records',
}

export default async function Page() {
  const worldRecords = await getWorldRecords();

  return (
    <PageLayout title="World Records" heroImage={{ src: S3_IMAGES.worldRecords, alt: 'World Records hero' }}>
      <section className="p-4 sm:p-0">
        <WorldRecordsTable data={worldRecords} />
      </section>
    </PageLayout>
  )
}