import { requireTestPageAccess } from '@lib/test-page-access';
import ClientPage from './ClientPage';

export default async function TestCSRPage() {
  await requireTestPageAccess();

  return <ClientPage />;
}
