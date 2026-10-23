'use server';

import { revalidatePath } from 'next/cache';
import { invalidateWorldRecordsCache } from '@lib/data-services';
import { actorOf, requireRecordsPermission } from '@lib/records-auth';
import { addCategoryAudit, getFirstCategories, getFirstCategory, getRecordCategories, getRecordCategory, putCategory } from '@lib/records-service';
import type { FirstCategoryRecord, FirstCategoryStatus, RecordCategoryRecord, RecordCategoryStatus, RecordRuleSet, RecordUnit } from '@lib/relational-types';

export interface CategoryUpdate {
  name?: string;
  group?: string;
  lineType?: string;
  status?: RecordCategoryStatus;
  order?: number;
  joint?: boolean;
  ruleSets?: RecordRuleSet[];
  comment?: string;
}

const done = () => {
  invalidateWorldRecordsCache();
  revalidatePath('/admin/records-categories');
  revalidatePath('/world_records');
};

/** Edit a record category. Status changes are admin decisions and are logged (FR-C1, FR-C5). */
export async function updateRecordCategory(categoryId: string, update: CategoryUpdate) {
  try {
    const session = await requireRecordsPermission('records:manage');
    const category = await getRecordCategory(categoryId);
    if (!category) return { success: false, error: 'Category not found' };
    const changes: string[] = [];
    const next: RecordCategoryRecord = { ...category };
    if (update.name !== undefined && update.name.trim() && update.name.trim() !== category.name) { next.name = update.name.trim(); changes.push(`name "${category.name}" → "${next.name}"`); }
    if (update.group !== undefined && update.group.trim() !== category.group) { next.group = update.group.trim(); changes.push(`group → "${next.group}"`); }
    if (update.lineType !== undefined && update.lineType.trim() !== category.lineType) { next.lineType = update.lineType.trim(); changes.push(`line type → "${next.lineType}"`); }
    if (update.status && update.status !== category.status) { next.status = update.status; changes.push(`status ${category.status} → ${update.status}`); }
    if (update.order !== undefined && update.order !== category.order) { next.order = update.order; changes.push(`order → ${update.order}`); }
    if (update.joint !== undefined && update.joint !== !!category.joint) { next.joint = update.joint; changes.push(`joint → ${update.joint}`); }
    if (update.ruleSets && update.ruleSets.join() !== category.ruleSets.join()) { next.ruleSets = update.ruleSets; changes.push(`rules → ${update.ruleSets.join(', ') || 'none'}`); }
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

export interface NewRecordCategory {
  name: string;
  group: string;
  lineType: string;
  direction: 'higher' | 'lower';
  valueType: 'number' | 'coordinates';
  unit: RecordUnit;
  leashed: boolean;
  joint: boolean;
  ruleSets: RecordRuleSet[];
  status: RecordCategoryStatus;
}

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function createRecordCategory(input: NewRecordCategory) {
  try {
    const session = await requireRecordsPermission('records:manage');
    if (!input.name.trim()) return { success: false, error: 'A name is required' };
    const existing = await getRecordCategories();
    let categoryId = slugify(input.name);
    if (existing.some(c => c.categoryId === categoryId)) categoryId = `${categoryId}-${Date.now().toString(36)}`;
    const now = Date.now();
    const category: RecordCategoryRecord = {
      pk: 'RecordCategory',
      sortKey: `RecordCategory:${categoryId}`,
      categoryId,
      name: input.name.trim(),
      group: input.group.trim() || 'Other',
      lineType: input.lineType.trim(),
      direction: input.direction,
      valueType: input.valueType,
      unit: input.unit,
      leashed: input.leashed,
      joint: input.joint || undefined,
      ruleSets: input.ruleSets,
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
