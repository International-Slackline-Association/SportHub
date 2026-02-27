import { requireEventSubmitter } from '@lib/authorization';
import PageLayout from '@ui/PageLayout';
import SubmitEventClient from './components/SubmitEventClient';

export default async function SubmitEventPage() {
  await requireEventSubmitter();

  return (
    <PageLayout title="Event Submission">
      <SubmitEventClient />
    </PageLayout>
  );
}
