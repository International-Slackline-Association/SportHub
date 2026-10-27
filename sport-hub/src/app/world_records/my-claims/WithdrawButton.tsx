'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { withdrawClaim } from '../actions';

export default function WithdrawButton({ kind, entryId }: { kind: 'record' | 'first'; entryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="destructive-secondary"
      size="small"
      disabled={busy}
      onClick={async () => {
        if (!confirm('Withdraw this claim? It goes back to being a draft you can edit and submit again.')) return;
        setBusy(true);
        const result = await withdrawClaim(kind, entryId);
        setBusy(false);
        if (!result.success) alert(result.errors.join('\n'));
        router.refresh();
      }}
    >
      Withdraw
    </Button>
  );
}
