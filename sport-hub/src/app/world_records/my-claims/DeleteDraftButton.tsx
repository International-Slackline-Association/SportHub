'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { deleteDraft } from '../actions';

/** Deletes a draft claim for good. The server checks that it is the user's own draft. */
export default function DeleteDraftButton({ kind, entryId }: { kind: 'record' | 'first'; entryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="destructive-secondary"
      size="small"
      disabled={busy}
      onClick={async () => {
        if (!confirm('Delete this draft? This cannot be undone.')) return;
        setBusy(true);
        const result = await deleteDraft(kind, entryId);
        setBusy(false);
        if (!result.success) alert(result.errors.join('\n'));
        router.refresh();
      }}
    >
      Delete draft
    </Button>
  );
}
