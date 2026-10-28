import type { Metadata } from 'next';
import Button from '@ui/Button';
import PageLayout from '@ui/PageLayout';
import { requireAdmin } from '@lib/authorization';
import { EXPORT_DATASETS, type ExportDataset } from '@lib/records-export';
import AdminNav from '../records-review/components/AdminNav';

export const metadata: Metadata = {
  title: 'SportHub - Export Records and Firsts',
};

export default async function RecordsExportPage() {
  await requireAdmin();
  const datasets = Object.entries(EXPORT_DATASETS) as [ExportDataset, string][];

  return (
    <PageLayout
      title="Export records and firsts"
      description="Download the data as CSV files, e.g. for Excel or Google Sheets. All entries except drafts are included. The files contain witness and athlete contact details: keep them within the ISA."
    >
      <AdminNav current="/admin/records-export" />
      <section className="p-4 sm:p-0 stack gap-3">
        {datasets.map(([dataset, label]) => (
          <div key={dataset} className="flex flex-wrap items-center gap-3 border border-gray-200 rounded-lg px-4 py-3">
            <span className="text-sm flex-1 min-w-48">{label}</span>
            <Button as="link" href={`/api/admin/records-export/${dataset}`} variant="secondary" size="small">
              Download {dataset}.csv
            </Button>
          </div>
        ))}
      </section>
    </PageLayout>
  );
}
