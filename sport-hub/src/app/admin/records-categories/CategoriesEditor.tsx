'use client';

import { useCallback, useState } from 'react';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import type { FirstCategoryTableItem, RecordCategoryTableItem } from '@lib/relational-types';
import { FirstCategoriesTable, RecordCategoriesTable } from './components/CategoriesTable';
import CategoryHistory from './components/CategoryHistory';
import FirstCategoryForm from './components/FirstCategoryForm';
import RecordCategoryForm from './components/RecordCategoryForm';

/** What the panel above a table shows: the create form, the edit form or the history of a category. */
type Panel<T> = { mode: 'new' } | { mode: 'edit'; category: T } | { mode: 'history'; category: T } | null;

export default function CategoriesEditor({ recordCategories, firstCategories }: { recordCategories: RecordCategoryTableItem[]; firstCategories: FirstCategoryTableItem[] }) {
  const [error, setError] = useState<string | null>(null);
  const [recordPanel, setRecordPanel] = useState<Panel<RecordCategoryTableItem>>(null);
  const [firstPanel, setFirstPanel] = useState<Panel<FirstCategoryTableItem>>(null);

  const editRecord = useCallback((category: RecordCategoryTableItem) => setRecordPanel({ mode: 'edit', category }), []);
  const recordHistory = useCallback((category: RecordCategoryTableItem) => setRecordPanel({ mode: 'history', category }), []);
  const editFirst = useCallback((category: FirstCategoryTableItem) => setFirstPanel({ mode: 'edit', category }), []);
  const firstHistory = useCallback((category: FirstCategoryTableItem) => setFirstPanel({ mode: 'history', category }), []);

  return (
    <div className="stack gap-6">
      {error && <Alert>{error}</Alert>}

      <div className="stack gap-3">
        <h3 className="text-lg font-semibold">World record categories</h3>
        {recordPanel === null && <div><Button variant="secondary" onClick={() => setRecordPanel({ mode: 'new' })}>Add a record category</Button></div>}
        {recordPanel?.mode === 'new' && <RecordCategoryForm onDone={() => setRecordPanel(null)} onError={setError} />}
        {recordPanel?.mode === 'edit' && (
          <RecordCategoryForm key={recordPanel.category.categoryId} category={recordPanel.category} onDone={() => setRecordPanel(null)} onError={setError} />
        )}
        {recordPanel?.mode === 'history' && (
          <CategoryHistory pk="RecordCategory" categoryId={recordPanel.category.categoryId} name={recordPanel.category.name} onClose={() => setRecordPanel(null)} />
        )}
        <RecordCategoriesTable categories={recordCategories} onEdit={editRecord} onHistory={recordHistory} onError={setError} />
      </div>

      <div className="stack gap-3">
        <h3 className="text-lg font-semibold">World first disciplines</h3>
        {firstPanel === null && <div><Button variant="secondary" onClick={() => setFirstPanel({ mode: 'new' })}>Add a first discipline</Button></div>}
        {firstPanel?.mode === 'new' && <FirstCategoryForm onDone={() => setFirstPanel(null)} onError={setError} />}
        {firstPanel?.mode === 'edit' && (
          <FirstCategoryForm key={firstPanel.category.categoryId} category={firstPanel.category} onDone={() => setFirstPanel(null)} onError={setError} />
        )}
        {firstPanel?.mode === 'history' && (
          <CategoryHistory pk="FirstCategory" categoryId={firstPanel.category.categoryId} name={firstPanel.category.name} onClose={() => setFirstPanel(null)} />
        )}
        <FirstCategoriesTable categories={firstCategories} onEdit={editFirst} onHistory={firstHistory} onError={setError} />
      </div>
    </div>
  );
}
