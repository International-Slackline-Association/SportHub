'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { deleteCategory } from '../actions';

type Props = {
  pk: 'RecordCategory' | 'FirstCategory';
  categoryId: string;
  name: string;
  onDone: () => void;
  onError: (error: string | null) => void;
};

/** Delete button of the edit popup; asks once more before deleting. Only unused categories can be deleted. */
export default function DeleteCategoryButton({ pk, categoryId, name, onDone, onError }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    const result = await deleteCategory(pk, categoryId);
    setBusy(false);
    setConfirming(false);
    onError(result.success ? null : result.error ?? 'Failed');
    if (result.success) { onDone(); router.refresh(); }
  };

  if (!confirming) {
    return <Button variant="destructive-secondary" onClick={() => setConfirming(true)}>Delete</Button>;
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm">Delete &quot;{name}&quot;?</span>
      <Button variant="destructive" size="small" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Yes, delete'}</Button>
      <Button variant="secondary" size="small" disabled={busy} onClick={() => setConfirming(false)}>No</Button>
    </div>
  );
}
