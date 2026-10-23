'use server';

import { revalidatePath } from 'next/cache';
import { invalidateWorldRecordsCache } from '@lib/data-services';
import { actorOf, requireRecordsPermission } from '@lib/records-auth';
import { parseRecordValue, unitKind } from '@lib/records-logic';
import {
  addCategoryAudit,
  getEntriesByCategory,
  getFirstCategories,
  getFirstCategory,
  getRecordCategories,
  getRecordCategory,
  putCategory,
  putEntry,
  recomputeRecordStatuses,
} from '@lib/records-service';
import { RECORD_CATEGORY_GROUPS } from '@lib/relational-types';
import type {
  FirstCategoryRecord,
  FirstCategoryStatus,
  RecordCategoryGroup,
  RecordCategoryRecord,
  RecordCategoryStatus,
  RecordEntryRecord,
  RecordUnit,
} from '@lib/relational-types';

export interface CategoryUpdate {
  name?: string;
  description?: string;
  group?: RecordCategoryGroup;
  unit?: RecordUnit;
  direction?: 'higher' | 'lower';
  status?: RecordCategoryStatus;
  order?: number;
  comment?: string;
}

const done = () => {
  invalidateWorldRecordsCache();
  revalidatePath('/admin/records-categories');
  revalidatePath('/world_records');
};

/**
 * Re-parses the values of a category's entries after its unit changed, so they
 * compare correctly, and re-derives which entries are current.
 */
async function reparseEntries(category: RecordCategoryRecord) {
  const entries = (await getEntriesByCategory(category.categoryId)).filter((e): e is RecordEntryRecord => e.kind === 'record');
  await Promise.all(entries.map(entry => {
    const text = entry.value.original ?? (entry.value.amount !== undefined ? String(entry.value.amount) : '');
    return putEntry({ ...entry, value: parseRecordValue(category, text), updatedAt: Date.now() });
  }));
  await recomputeRecordStatuses(category);
}

/** Edit a record category. Status changes are admin decisions and are logged (FR-C1, FR-C5). */
export async function updateRecordCategory(categoryId: string, update: CategoryUpdate) {
  try {
    const session = await requireRecordsPermission('records:manage');
    const category = await getRecordCategory(categoryId);
    if (!category) return { success: false, error: 'Category not found' };
    const changes: string[] = [];
    const next: RecordCategoryRecord = { ...category };
    if (update.name !== undefined && update.name.trim() && update.name.trim() !== category.name) { next.name = update.name.trim(); changes.push(`name "${category.name}" → "${next.name}"`); }
    if (update.description !== undefined && update.description.trim() !== (category.description ?? '')) { next.description = update.description.trim() || undefined; changes.push('description edited'); }
    if (update.group && update.group !== category.group) {
      if (!RECORD_CATEGORY_GROUPS.includes(update.group)) return { success: false, error: 'Unknown group' };
      next.group = update.group; changes.push(`group ${category.group} → ${update.group}`);
    }
    if (update.unit !== undefined && update.unit.trim() && update.unit.trim() !== category.unit) { next.unit = update.unit.trim(); changes.push(`unit "${category.unit}" → "${next.unit}"`); }
    if (update.direction && update.direction !== category.direction) { next.direction = update.direction; changes.push(`${update.direction} is better`); }
    if (update.status && update.status !== category.status) { next.status = update.status; changes.push(`status ${category.status} → ${update.status}`); }
    if (update.order !== undefined && update.order !== category.order) { next.order = update.order; changes.push(`order → ${update.order}`); }
    if (changes.length === 0) return { success: true };
    next.updatedAt = Date.now();
    await putCategory(next);
    const reparse = unitKind(next.unit) !== unitKind(category.unit) || (next.group === 'Altitude') !== (category.group === 'Altitude');
    if (reparse) await reparseEntries(next);
    else if (next.direction !== category.direction) await recomputeRecordStatuses(next);
    await addCategoryAudit(next, {
      action: update.status && update.status !== category.status ? 'status_changed' : 'edited',
      comment: [changes.join('; '), update.comment].filter(Boolean).join('. '),
      ...actorOf(session),
    });
    done();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update the category' };
  }
}

export interface NewRecordCategory {
  name: string;
  description: string;
  group: RecordCategoryGroup;
  unit: RecordUnit;
  direction: 'higher' | 'lower';
  status: RecordCategoryStatus;
}

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function createRecordCategory(input: NewRecordCategory) {
  try {
    const session = await requireRecordsPermission('records:manage');
    if (!input.name.trim()) return { success: false, error: 'A name is required' };
    if (!input.unit.trim()) return { success: false, error: 'A unit is required' };
    if (!RECORD_CATEGORY_GROUPS.includes(input.group)) return { success: false, error: 'Unknown group' };
    const existing = await getRecordCategories();
    let categoryId = slugify(input.name);
    if (existing.some(c => c.categoryId === categoryId)) categoryId = `${categoryId}-${Date.now().toString(36)}`;
    const now = Date.now();
    const category: RecordCategoryRecord = {
      pk: 'RecordCategory',
      sortKey: `RecordCategory:${categoryId}`,
      categoryId,
      name: input.name.trim(),
      description: input.description.trim() || undefined,
      group: input.group,
      unit: input.unit.trim(),
      direction: input.direction,
      status: input.status,
      order: Math.max(0, ...existing.map(c => c.order)) + 1,
      createdAt: now,
      updatedAt: now,
    };
    await putCategory(category);
    await addCategoryAudit(category, { action: 'created', ...actorOf(session) });
    done();
    return { success: true, categoryId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create the category' };
  }
}

/** Edit a world first discipline. Changes are logged like record categories (FR-C5). */
export async function updateFirstCategory(categoryId: string, update: { name?: string; status?: FirstCategoryStatus; terminationRule?: string; order?: number; comment?: string }) {
  try {
    const session = await requireRecordsPermission('records:manage');
    const category = await getFirstCategory(categoryId);
    if (!category) return { success: false, error: 'Category not found' };
    const changes: string[] = [];
    const next: FirstCategoryRecord = { ...category };
    if (update.name !== undefined && update.name.trim() && update.name.trim() !== category.name) { next.name = update.name.trim(); changes.push(`name "${category.name}" → "${next.name}"`); }
    if (update.terminationRule !== undefined && update.terminationRule.trim() !== (category.terminationRule ?? '')) { next.terminationRule = update.terminationRule.trim() || undefined; changes.push('termination rule edited'); }
    if (update.status && update.status !== category.status) { next.status = update.status; changes.push(`status ${category.status} → ${update.status}`); }
    if (update.order !== undefined && update.order !== category.order) { next.order = update.order; changes.push(`order → ${update.order}`); }
    if (changes.length === 0) return { success: true };
    next.updatedAt = Date.now();
    await putCategory(next);
    await addCategoryAudit(next, {
      action: update.status && update.status !== category.status ? 'status_changed' : 'edited',
      comment: [changes.join('; '), update.comment].filter(Boolean).join('. '),
      ...actorOf(session),
    });
    done();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update the category' };
  }
}

export interface NewFirstCategory {
  name: string;
  terminationRule: string;
  status: FirstCategoryStatus;
}

export async function createFirstCategory(input: NewFirstCategory) {
  try {
    const session = await requireRecordsPermission('records:manage');
    if (!input.name.trim()) return { success: false, error: 'A name is required' };
    const existing = await getFirstCategories();
    let categoryId = slugify(input.name);
    if (existing.some(c => c.categoryId === categoryId)) categoryId = `${categoryId}-${Date.now().toString(36)}`;
    const now = Date.now();
    const category: FirstCategoryRecord = {
      pk: 'FirstCategory',
      sortKey: `FirstCategory:${categoryId}`,
      categoryId,
      name: input.name.trim(),
      terminationRule: input.terminationRule.trim() || undefined,
      status: input.status,
      order: Math.max(0, ...existing.map(c => c.order)) + 1,
      createdAt: now,
      updatedAt: now,
    };
    await putCategory(category);
    await addCategoryAudit(category, { action: 'created', ...actorOf(session) });
    done();
    return { success: true, categoryId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create the category' };
  }
}
