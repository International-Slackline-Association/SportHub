'use client';
import Link from 'next/link';

import { useSession } from 'next-auth/react';
import { Button } from '@slacklineinternational/onsight/react';
import type { WorldFirst, WorldRecord } from '@lib/data-services';
import { roleHasPermission } from 'src/types/rbac';

/** Record Managers and General Admins may edit published records and firsts. */
export const useCanEditRecords = () => roleHasPermission(useSession().data?.user?.roles, 'records:manage');

/** Record Managers and General Admins only: open a published entry to correct, reclassify or void it. */
export function AdminEditButton({ entry }: { entry: WorldRecord | WorldFirst }) {
  const canEdit = useCanEditRecords();
  if (!canEdit) return null;
  const kind = 'trickName' in entry ? 'first' : 'record';
  return (
    <Button as={Link} href={`/admin/records-review/${kind}/${encodeURIComponent(entry.entryId)}`} variant="secondary" size="small">
      Edit
    </Button>
  );
}
