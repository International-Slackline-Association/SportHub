'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { WorldFirst, WorldRecord } from '@lib/data-services';

/** Admins only: open a published entry to correct, reclassify or void it. */
export function AdminEditLink({ entry }: { entry: WorldRecord | WorldFirst }) {
  const { data: session } = useSession();
  if (session?.user?.role !== 'admin') return null;
  const kind = 'trickName' in entry ? 'first' : 'record';
  return (
    <Link className="underline text-amber-700 hover:text-amber-900" href={`/admin/records-review/${kind}/${encodeURIComponent(entry.entryId)}`}>
      Edit
    </Link>
  );
}
