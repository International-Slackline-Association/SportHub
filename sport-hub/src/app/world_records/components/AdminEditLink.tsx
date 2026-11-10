'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { WorldFirst, WorldRecord } from '@lib/data-services';
import { roleHasPermission } from 'src/types/rbac';

/** Record Managers and General admins only: open a published entry to correct, reclassify or void it. */
export function AdminEditLink({ entry }: { entry: WorldRecord | WorldFirst }) {
  const { data: session } = useSession();
  if (!roleHasPermission(session?.user?.roles, 'records:manage')) return null;
  const kind = 'trickName' in entry ? 'first' : 'record';
  return (
    <Link className="underline text-amber-700 hover:text-amber-900" href={`/admin/records-review/${kind}/${encodeURIComponent(entry.entryId)}`}>
      Edit
    </Link>
  );
}
