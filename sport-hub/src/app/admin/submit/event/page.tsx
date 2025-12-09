import { requireAdmin } from '@lib/authorization';
import PageLayout from '@ui/PageLayout';
import SubmitEventClient from './components/SubmitEventClient';

export default async function SubmitEventPage() {
  // Require admin role (redirects if unauthorized)
  await requireAdmin();

  return (
    <PageLayout title="Event Submission">
      <SubmitEventClient />
    </PageLayout>
  );
}
