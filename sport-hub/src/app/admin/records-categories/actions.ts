'use server';

import { revalidatePath } from 'next/cache';
import { invalidateWorldRecordsCache } from '@lib/data-services';
import { actorOf, requireRecordsPermission } from '@lib/records-auth';
import { parseRecordValue, slugify, unitKind } from '@lib/records-logic';
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

const revalidateCategoryPages = () => {
  invalidateWorldRecordsCache();
  revalidatePath('/admin/records-categories');
  revalidatePath('/world_records');
};

// Server actions take untrusted input: check enum fields before they are stored
const RECORD_STATUSES: RecordCategoryStatus[] = ['active', 'unchallenged', 'archived'];
const FIRST_STATUSES: FirstCategoryStatus[] = ['active', 'archived'];
const DIRECTIONS = ['higher', 'lower'];

function invalidRecordCategoryInput(input: Partial<Pick<CategoryUpdate, 'group' | 'direction' | 'status'>>): string | null {
  if (input.group !== undefined && !RECORD_CATEGORY_GROUPS.includes(input.group)) return 'Unknown group';
  if (input.direction !== undefined && !DIRECTIONS.includes(input.direction)) return 'Unknown direction';
  if (input.status !== undefined && !RECORD_STATUSES.includes(input.status)) return 'Unknown status';
  return null;
}

/**
 * Re-parses the values of a category's entries after its unit changed, so they
 * compare correctly, and re-derives which entries are current.
 */
async function reparseEntries(category: RecordCategoryRecord) {
  const entries = await getEntriesByCategory('record', category.categoryId);
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
    const invalid = invalidRecordCategoryInput(update);
    if (invalid) return { success: false, error: invalid };
    const category = await getRecordCategory(categoryId);
    if (!category) return { success: false, error: 'Category not found' };
    const changes: string[] = [];
    const next: RecordCategoryRecord = { ...category };
    if (update.name !== undefined && update.name.trim() && update.name.trim() !== category.name) { next.name = update.name.trim(); changes.push(`name "${category.name}" → "${next.name}"`); }
    if (update.description !== undefined && update.description.trim() !== (category.description ?? '')) { next.description = update.description.trim() || undefined; changes.push('description edited'); }
    if (update.group && update.group !== category.group) { next.group = update.group; changes.push(`group ${category.group} → ${update.group}`); }
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
    revalidateCategoryPages();
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

export async function createRecordCategory(input: NewRecordCategory) {
  try {
    const session = await requireRecordsPermission('records:manage');
    if (!input.name.trim()) return { success: false, error: 'A name is required' };
    if (!input.unit.trim()) return { success: false, error: 'A unit is required' };
    const invalid = invalidRecordCategoryInput(input);
    if (invalid) return { success: false, error: invalid };
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
    revalidateCategoryPages();
    return { success: true, categoryId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create the category' };
  }
}

/** Edit a world first discipline. Changes are logged like record categories (FR-C5). */
export async function updateFirstCategory(categoryId: string, update: { name?: string; status?: FirstCategoryStatus; terminationRule?: string; order?: number; comment?: string }) {
  try {
    const session = await requireRecordsPermission('records:manage');
    if (update.status !== undefined && !FIRST_STATUSES.includes(update.status)) return { success: false, error: 'Unknown status' };
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
    revalidateCategoryPages();
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
    if (!FIRST_STATUSES.includes(input.status)) return { success: false, error: 'Unknown status' };
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
    revalidateCategoryPages();
    return { success: true, categoryId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create the category' };
  }
}
