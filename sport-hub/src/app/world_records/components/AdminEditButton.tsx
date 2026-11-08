'use client';

import { useSession } from 'next-auth/react';
import Button from '@ui/Button';
import type { WorldFirst, WorldRecord } from '@lib/data-services';

export const useIsAdmin = () => useSession().data?.user?.role === 'admin';

/** Admins only: open a published entry to correct, reclassify or void it. */
export function AdminEditButton({ entry }: { entry: WorldRecord | WorldFirst }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  const kind = 'trickName' in entry ? 'first' : 'record';
  return (
    <Button as="link" href={`/admin/records-review/${kind}/${encodeURIComponent(entry.entryId)}`} variant="secondary" size="small">
      Edit
    </Button>
  );
}
