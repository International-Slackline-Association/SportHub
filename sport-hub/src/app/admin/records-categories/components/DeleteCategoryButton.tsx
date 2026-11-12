'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { deleteCategory } from '../actions';

type Props = {
  pk: 'RecordCategory' | 'FirstCategory';
  categoryId: string;
  name: string;
};

/** Deletes an unused category after asking once more, then returns to the list. */
export default function DeleteCategoryButton({ pk, categoryId, name }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    const result = await deleteCategory(pk, categoryId);
    if (result.success) { router.push('/admin/records-categories'); router.refresh(); return; }
    setBusy(false);
    setConfirming(false);
    setError(result.error ?? 'Failed');
  };

  if (!confirming) {
    return (
      <div className="stack gap-2">
        <div><Button variant="destructive-secondary" onClick={() => setConfirming(true)}>Delete</Button></div>
        {error && <Alert>{error}</Alert>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm">Delete &quot;{name}&quot;?</span>
      <Button variant="destructive" size="small" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Yes, delete'}</Button>
      <Button variant="secondary" size="small" disabled={busy} onClick={() => setConfirming(false)}>No</Button>
    </div>
  );
}
