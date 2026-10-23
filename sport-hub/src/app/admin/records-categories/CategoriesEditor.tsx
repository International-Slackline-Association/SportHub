'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { UNIT_SUGGESTIONS, unitKind } from '@lib/records-logic';
import { RECORD_CATEGORY_GROUPS } from '@lib/relational-types';
import type { FirstCategoryRecord, FirstCategoryStatus, RecordCategoryGroup, RecordCategoryRecord, RecordCategoryStatus } from '@lib/relational-types';
import { createFirstCategory, createRecordCategory, updateFirstCategory, updateRecordCategory, type NewFirstCategory, type NewRecordCategory } from './actions';

const inputClass = 'border border-gray-300 rounded px-2 py-1 text-sm';
const STATUS_OPTIONS: RecordCategoryStatus[] = ['active', 'unchallenged', 'archived'];
const FIRST_STATUS_OPTIONS: FirstCategoryStatus[] = ['active', 'archived'];

const UNIT_LIST_ID = 'record-unit-suggestions';

function UnitSuggestions() {
  return (
    <datalist id={UNIT_LIST_ID}>
      {UNIT_SUGGESTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
    </datalist>
  );
}

const unitNote = (unit: string) => {
  switch (unitKind(unit)) {
    case 'm': return 'metres';
    case 's': return 'time, stored in seconds';
    case 'count': return 'count';
    case 'coordinates': return 'coordinates, compared by absolute latitude';
    default: return 'plain number';
  }
};

type RecordDraft = Pick<RecordCategoryRecord, 'name' | 'group' | 'unit' | 'direction' | 'order'> & { description: string };

function RecordCategoryFields({ value, onChange }: { value: Omit<RecordDraft, 'order'>; onChange: (v: Partial<RecordDraft>) => void }) {
  return (
    <>
      <label className="text-xs stack gap-0.5">Name
        <input className={inputClass} value={value.name} onChange={e => onChange({ name: e.target.value })} />
      </label>
      <label className="text-xs stack gap-0.5">Description
        <textarea className={inputClass} rows={2} value={value.description} placeholder="What is measured and how" onChange={e => onChange({ description: e.target.value })} />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-xs stack gap-0.5">Group
          <select className={inputClass} value={value.group} onChange={e => onChange({ group: e.target.value as RecordCategoryGroup })}>
            {RECORD_CATEGORY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="text-xs stack gap-0.5">Unit
          <input className={inputClass} list={UNIT_LIST_ID} value={value.unit} placeholder="m, s, count, °, kg…" onChange={e => onChange({ unit: e.target.value })} />
          <span className="text-gray-500">{unitNote(value.unit)}</span>
        </label>
        <label className="text-xs stack gap-0.5">Better is
          <select className={inputClass} value={value.direction} onChange={e => onChange({ direction: e.target.value as 'higher' | 'lower' })}>
            <option value="higher">Higher is better</option>
            <option value="lower">Lower is better</option>
          </select>
        </label>
      </div>
    </>
  );
}

function RecordCategoryRow({ category, onError }: { category: RecordCategoryRecord; onError: (e: string | null) => void }) {
  const router = useRouter();
  const initial: RecordDraft = { name: category.name, description: category.description ?? '', group: category.group, unit: category.unit, direction: category.direction, order: category.order };
  const [draft, setDraft] = useState<RecordDraft>(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (update: Parameters<typeof updateRecordCategory>[1]) => {
    setBusy(true);
    const result = await updateRecordCategory(category.categoryId, update);
    setBusy(false);
    onError(result.success ? null : result.error ?? 'Failed');
    if (result.success) { setEditing(false); router.refresh(); }
  };

  return (
    <tr
      className={`border-b border-gray-100 align-top ${editing ? '' : 'cursor-pointer hover:bg-gray-50'}`}
      onClick={() => { if (!editing) setEditing(true); }}
      onKeyDown={e => { if (!editing && e.key === 'Enter' && e.target === e.currentTarget) setEditing(true); }}
      tabIndex={editing ? undefined : 0}
    >
      <td className="py-2 pr-2">
        {editing ? (
          <div className="stack gap-2">
            <RecordCategoryFields value={draft} onChange={v => setDraft({ ...draft, ...v })} />
            <label className="text-xs flex gap-1 items-center">Order <input type="number" className={`${inputClass} w-20`} value={draft.order} onChange={e => setDraft({ ...draft, order: Number(e.target.value) })} /></label>
            {unitKind(draft.unit) !== unitKind(category.unit) && (
              <span className="text-xs text-amber-700">Changing the unit type re-reads the values of all entries in this category.</span>
            )}
            <div className="flex gap-2">
              <Button size="small" variant="primary" disabled={busy || !draft.name.trim() || !draft.unit.trim()} onClick={() => save(draft)}>Save</Button>
              <Button size="small" variant="ghost" onClick={() => { setDraft(initial); setEditing(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <span className="font-medium">{category.name}</span>
            {category.description && <span className="text-xs text-gray-700">{category.description}</span>}
            <span className="text-xs text-gray-500">{category.categoryId}</span>
          </div>
        )}
      </td>
      <td className="py-2 pr-2 text-xs">{category.group}</td>
      <td className="py-2 pr-2 text-xs whitespace-nowrap">{category.unit} · {category.direction} is better</td>
      <td className="py-2 pr-2" onClick={e => e.stopPropagation()}>
        <select
          className={inputClass}
          value={category.status}
          disabled={busy}
          onChange={e => {
            const status = e.target.value as RecordCategoryStatus;
            const comment = prompt(`Set "${category.name}" to ${status}? Optional reason:`);
            if (comment === null) { e.target.value = category.status; return; }
            save({ status, comment });
          }}
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
    </tr>
  );
}

const emptyNew: NewRecordCategory = { name: '', description: '', group: 'Length', unit: 'm', direction: 'higher', status: 'unchallenged' };

function NewCategoryForm({ onError }: { onError: (e: string | null) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<NewRecordCategory>(emptyNew);
  const [busy, setBusy] = useState(false);
  if (!open) return <div><Button variant="secondary" onClick={() => setOpen(true)}>Add a record category</Button></div>;
  return (
    <div className="border border-gray-200 rounded-lg p-4 stack gap-2 text-sm">
      <h3 className="font-semibold">New record category</h3>
      <RecordCategoryFields value={value} onChange={v => setValue({ ...value, ...v })} />
      <label className="text-xs stack gap-0.5 sm:w-1/3">Status
        <select className={inputClass} value={value.status} onChange={e => setValue({ ...value, status: e.target.value as RecordCategoryStatus })}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={busy || !value.name.trim() || !value.unit.trim()}
          onClick={async () => {
            setBusy(true);
            const result = await createRecordCategory(value);
            setBusy(false);
            onError(result.success ? null : result.error ?? 'Failed');
            if (result.success) { setValue(emptyNew); setOpen(false); router.refresh(); }
          }}
        >
          Create
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function FirstCategoryRow({ category, onError }: { category: FirstCategoryRecord; onError: (e: string | null) => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState({ name: category.name, terminationRule: category.terminationRule ?? '', order: category.order });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (update: Parameters<typeof updateFirstCategory>[1]) => {
    setBusy(true);
    const result = await updateFirstCategory(category.categoryId, update);
    setBusy(false);
    onError(result.success ? null : result.error ?? 'Failed');
    if (result.success) { setEditing(false); router.refresh(); }
  };

  return (
    <tr
      className={`border-b border-gray-100 align-top ${editing ? '' : 'cursor-pointer hover:bg-gray-50'}`}
      onClick={() => { if (!editing) setEditing(true); }}
      onKeyDown={e => { if (!editing && e.key === 'Enter' && e.target === e.currentTarget) setEditing(true); }}
      tabIndex={editing ? undefined : 0}
    >
      <td className="py-2 pr-2">
        {editing ? (
          <div className="stack gap-1">
            <input className={inputClass} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            <textarea className={inputClass} rows={3} value={draft.terminationRule} placeholder="Termination rule: when the trick counts as landed" onChange={e => setDraft({ ...draft, terminationRule: e.target.value })} />
            <label className="text-xs flex gap-1 items-center">Order <input type="number" className={`${inputClass} w-20`} value={draft.order} onChange={e => setDraft({ ...draft, order: Number(e.target.value) })} /></label>
            <div className="flex gap-2">
              <Button size="small" variant="primary" disabled={busy} onClick={() => save(draft)}>Save</Button>
              <Button size="small" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <span className="font-medium">{category.name}</span>
            <span className="text-xs text-gray-500">{category.terminationRule || 'no termination rule'} · {category.categoryId}</span>
          </div>
        )}
      </td>
      <td className="py-2 pr-2" onClick={e => e.stopPropagation()}>
        <select
          className={inputClass}
          value={category.status}
          disabled={busy}
          onChange={e => {
            const status = e.target.value as FirstCategoryStatus;
            const comment = prompt(`Set "${category.name}" to ${status}? Optional reason:`);
            if (comment === null) { e.target.value = category.status; return; }
            save({ status, comment });
          }}
        >
          {FIRST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
    </tr>
  );
}

const emptyNewFirst: NewFirstCategory = { name: '', terminationRule: '', status: 'active' };

function NewFirstCategoryForm({ onError }: { onError: (e: string | null) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<NewFirstCategory>(emptyNewFirst);
  const [busy, setBusy] = useState(false);
  if (!open) return <div><Button variant="secondary" onClick={() => setOpen(true)}>Add a first discipline</Button></div>;
  return (
    <div className="border border-gray-200 rounded-lg p-4 stack gap-2 text-sm">
      <h3 className="font-semibold">New first discipline</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input className={inputClass} placeholder="Name, e.g. Waterline" value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} />
        <select className={inputClass} value={value.status} onChange={e => setValue({ ...value, status: e.target.value as FirstCategoryStatus })}>
          {FIRST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <textarea className={inputClass} rows={3} placeholder="Termination rule: when the trick counts as landed" value={value.terminationRule} onChange={e => setValue({ ...value, terminationRule: e.target.value })} />
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={busy || !value.name.trim()}
          onClick={async () => {
            setBusy(true);
            const result = await createFirstCategory(value);
            setBusy(false);
            onError(result.success ? null : result.error ?? 'Failed');
            if (result.success) { setValue(emptyNewFirst); setOpen(false); router.refresh(); }
          }}
        >
          Create
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

type SortKey = 'order' | 'name' | 'group' | 'unit' | 'status';

const compareBy = (key: SortKey, a: RecordCategoryRecord, b: RecordCategoryRecord): number => {
  switch (key) {
    case 'order': return a.order - b.order;
    case 'group': return RECORD_CATEGORY_GROUPS.indexOf(a.group) - RECORD_CATEGORY_GROUPS.indexOf(b.group) || a.order - b.order;
    case 'status': return STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status) || a.order - b.order;
    default: return a[key].localeCompare(b[key]) || a.order - b.order;
  }
};

export default function CategoriesEditor({ recordCategories, firstCategories }: { recordCategories: RecordCategoryRecord[]; firstCategories: FirstCategoryRecord[] }) {
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RecordCategoryStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'order', desc: false });
  const q = search.trim().toLowerCase();
  const shown = recordCategories
    .filter(c => filter === 'all' || c.status === filter)
    .filter(c => !q || [c.name, c.description, c.group, c.unit, c.categoryId].some(v => v?.toLowerCase().includes(q)))
    .sort((a, b) => (sort.desc ? -1 : 1) * compareBy(sort.key, a, b));

  const header = (key: SortKey, label: string) => (
    <th className="py-2 pr-2">
      <button
        type="button"
        className="font-semibold hover:underline"
        onClick={() => setSort(sort.key === key ? { key, desc: !sort.desc } : { key, desc: false })}
      >
        {label}{sort.key === key ? (sort.desc ? ' ▼' : ' ▲') : ''}
      </button>
    </th>
  );

  return (
    <div className="stack gap-6">
      {error && <Alert>{error}</Alert>}
      <UnitSuggestions />
      <div className="stack gap-3">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold">World record categories</h3>
          <select className={inputClass} value={filter} onChange={e => setFilter(e.target.value as RecordCategoryStatus | 'all')}>
            <option value="all">All ({recordCategories.length})</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s} ({recordCategories.filter(c => c.status === s).length})</option>)}
          </select>
        </div>
        <NewCategoryForm onError={setError} />
        <input
          className={`${inputClass} w-full sm:max-w-sm`}
          type="search"
          placeholder="Search categories"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                {header('name', 'Category')}
                {header('group', 'Group')}
                {header('unit', 'Unit')}
                {header('status', 'Status')}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={4} className="py-3 text-gray-500">No categories match.</td></tr>}
              {shown.map(c => <RecordCategoryRow key={c.categoryId} category={c} onError={setError} />)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stack gap-3">
        <h3 className="text-lg font-semibold">World first disciplines</h3>
        <NewFirstCategoryForm onError={setError} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="py-2 pr-2">Discipline</th>
                <th className="py-2 pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {firstCategories.map(c => <FirstCategoryRow key={c.categoryId} category={c} onError={setError} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
