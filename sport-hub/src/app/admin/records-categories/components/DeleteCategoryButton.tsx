'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { deleteCategory } from '../actions';

const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';

type Props = {
  pk: 'RecordCategory' | 'FirstCategory';
  categoryId: string;
};

/** Permanent delete of an unused category, like for records: a reason and typing DELETE are required. */
export default function DeleteCategoryButton({ pk, categoryId }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canDelete = !!reason.trim() && confirmation.trim() === 'DELETE';

  const remove = async () => {
    setBusy(true);
    const result = await deleteCategory(pk, categoryId, reason, confirmation);
    if (result.success) { router.push('/admin/records-categories'); router.refresh(); return; }
    setBusy(false);
    setError(result.error ?? 'Failed');
  };

  return (
    <div className="stack gap-2">
      <textarea
        className={inputClass}
        rows={2}
        placeholder="Reason (required, kept in the category history)"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Type DELETE to confirm"
        aria-label="Type DELETE to confirm"
        value={confirmation}
        onChange={e => setConfirmation(e.target.value)}
      />
      {error && <Alert>{error}</Alert>}
      <div>
        <Button variant="destructive" disabled={busy || !canDelete} onClick={remove}>Delete permanently</Button>
      </div>
    </div>
  );
}
