import { Metadata } from 'next';
import PageLayout from '@ui/PageLayout';
import { requireAdmin } from '@lib/authorization';
import DuplicateAccountsLookup from './DuplicateAccountsLookup';

export const metadata: Metadata = {
  title: 'SportHub - Duplicate Accounts',
};

export default async function DuplicateAccountsPage() {
  await requireAdmin();

  return (
    <PageLayout
      title="Fix Duplicate Accounts"
      description={
        <>
          Move all contest results and participation records from the secondary account into the
          primary account and optionally delete the secondary profile.<br/>
          <strong>Important:</strong> If the ISA IDs or emails differ between accounts, reach out
          to the SportHub team and athlete so that the correct account is retained as the primary profile.
        </>
      }
    >
      <DuplicateAccountsLookup />
    </PageLayout>
  );
}
