import type { Metadata } from 'next';
import Link from 'next/link';
import Button from '@ui/Button';
import PageLayout from '@ui/PageLayout';
import { Alert } from '@ui/Alert';
import { requireAuth } from '@lib/authorization';
import { getUser } from '@lib/user-service';
import type { ClaimStatus } from '@lib/relational-types';
import { getClaimFormOptions, getOwnClaim } from '../actions';
import { emptyClaim, entryToClaimValues, type ClaimFormValues } from './types';
import ClaimForm from './components/ClaimForm';

export const metadata: Metadata = {
  title: 'SportHub - Claim a World Record or First',
};

type Props = { searchParams: Promise<{ kind?: string; id?: string; path?: string }> };

export default async function ClaimPage({ searchParams }: Props) {
  const session = await requireAuth();
  const { kind, id, path } = await searchParams;
  const { recordCategories, firstCategories } = await getClaimFormOptions();

  let initialValues: ClaimFormValues;
  let reviewComment: string | undefined;
  let status: ClaimStatus | undefined;
  if (id && (kind === 'record' || kind === 'first')) {
    const entry = await getOwnClaim(kind, id);
    if (!entry || !['draft', 'changes_requested'].includes(entry.status)) {
      return (
        <PageLayout title="Claim a World Record or First">
          <section className="p-4 sm:p-0 stack gap-2">
            <Alert>This claim cannot be edited. It may be under review or already decided.</Alert>
            <Button as="link" href="/world_records/my-claims" variant="secondary" size="small">Back to my claims</Button>
          </section>
        </PageLayout>
      );
    }
    initialValues = entryToClaimValues(entry);
    status = entry.status;
    if (entry.status === 'changes_requested') reviewComment = entry.reviewComment;
  } else {
    initialValues = emptyClaim(path === 'first' ? 'first' : path === 'new_category' ? 'new_category' : 'existing');
    // The claimant is usually the athlete; they can change it
    const profile = await getUser(session.user.id);
    if (profile) {
      initialValues.athletes = [{ userId: profile.userId, name: [profile.name, profile.surname].filter(Boolean).join(' ') || profile.userId }];
    }
  }

  return (
    <PageLayout
      title="Claim a World Record or First"
      description={
        <>
          Submit a world record or world first for review by the ISA. You can save a draft and come back to it on{' '}
          <Link href="/world_records/my-claims" className="underline">My claims</Link>.
        </>
      }
    >
      <ClaimForm
        recordCategories={recordCategories}
        firstCategories={firstCategories}
        initialValues={initialValues}
        claimantId={session.user.id}
        reviewComment={reviewComment}
        status={status}
      />
    </PageLayout>
  );
}
