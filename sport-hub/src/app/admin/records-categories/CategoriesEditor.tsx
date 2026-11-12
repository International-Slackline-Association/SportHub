'use client';

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@ui/Button';
import Modal from '@ui/Modal';
import { Alert } from '@ui/Alert';
import type { FirstCategoryTableItem, RecordCategoryTableItem } from '@lib/relational-types';
import { FirstCategoriesTable, RecordCategoriesTable } from './components/CategoriesTable';
import CategoryHistory from './components/CategoryHistory';
import FirstCategoryForm from './components/FirstCategoryForm';
import RecordCategoryForm from './components/RecordCategoryForm';

/** What the popup shows: the create form, the edit form or the history of a record category or first discipline. */
type Dialog =
  | { kind: 'record'; mode: 'new' }
  | { kind: 'record'; mode: 'edit' | 'history'; category: RecordCategoryTableItem }
  | { kind: 'first'; mode: 'new' }
  | { kind: 'first'; mode: 'edit' | 'history'; category: FirstCategoryTableItem };

const dialogTitle = (dialog: Dialog) => {
  if (dialog.mode === 'new') return dialog.kind === 'record' ? 'New record category' : 'New first discipline';
  return dialog.mode === 'edit' ? `Edit "${dialog.category.name}"` : `History of "${dialog.category.name}"`;
};

function DialogBody({ dialog, onDone, onError }: { dialog: Dialog; onDone: () => void; onError: (error: string | null) => void }) {
  if (dialog.mode === 'history') {
    const pk = dialog.kind === 'record' ? 'RecordCategory' : 'FirstCategory';
    return <CategoryHistory pk={pk} categoryId={dialog.category.categoryId} />;
  }
  if (dialog.kind === 'record') {
    return <RecordCategoryForm category={dialog.mode === 'edit' ? dialog.category : undefined} onDone={onDone} onError={onError} />;
  }
  return <FirstCategoryForm category={dialog.mode === 'edit' ? dialog.category : undefined} onDone={onDone} onError={onError} />;
}

export default function CategoriesEditor({ recordCategories, firstCategories }: { recordCategories: RecordCategoryTableItem[]; firstCategories: FirstCategoryTableItem[] }) {
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const open = useCallback((next: Dialog) => { setDialogError(null); setDialog(next); }, []);
  const close = useCallback(() => { setDialogError(null); setDialog(null); }, []);

  const editRecord = useCallback((category: RecordCategoryTableItem) => open({ kind: 'record', mode: 'edit', category }), [open]);
  const recordHistory = useCallback((category: RecordCategoryTableItem) => open({ kind: 'record', mode: 'history', category }), [open]);
  const editFirst = useCallback((category: FirstCategoryTableItem) => open({ kind: 'first', mode: 'edit', category }), [open]);
  const firstHistory = useCallback((category: FirstCategoryTableItem) => open({ kind: 'first', mode: 'history', category }), [open]);

  return (
    <div className="stack gap-6">
      {error && <Alert>{error}</Alert>}

      <div className="stack gap-3">
        <h3 className="text-lg font-semibold">World record categories</h3>
        <div><Button variant="secondary" onClick={() => open({ kind: 'record', mode: 'new' })}>Add a record category</Button></div>
        <RecordCategoriesTable categories={recordCategories} onEdit={editRecord} onHistory={recordHistory} onError={setError} />
      </div>

      <div className="stack gap-3">
        <h3 className="text-lg font-semibold">World first disciplines</h3>
        <div><Button variant="secondary" onClick={() => open({ kind: 'first', mode: 'new' })}>Add a first discipline</Button></div>
        <FirstCategoriesTable categories={firstCategories} onEdit={editFirst} onHistory={firstHistory} onError={setError} />
      </div>

      {dialog && typeof document !== 'undefined' && createPortal(
        <Modal isOpen onClose={close} title={dialogTitle(dialog)}>
          <div className="stack gap-3">
            {dialogError && <Alert>{dialogError}</Alert>}
            <DialogBody dialog={dialog} onDone={close} onError={setDialogError} />
          </div>
        </Modal>,
        document.body,
      )}
    </div>
  );
}
