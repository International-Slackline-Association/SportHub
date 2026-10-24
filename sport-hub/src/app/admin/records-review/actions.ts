'use server';

/**
 * Reviewer and admin server actions for record and first claims (requirements
 * §7.5): the review queue and detail, approve / request changes / reject, void
 * and restore published entries, and "Modify" (edit every field of an entry).
 *
 * Reviewing needs records:review; changing a published entry needs records:manage.
 * Admins hold both.
 */

import { revalidatePath } from 'next/cache';
import { invalidateWorldRecordsCache } from '@lib/data-services';
import { actorOf, requireRecordsPermission } from '@lib/records-auth';
import {
  addAuditEntry,
  addCategoryAudit,
  getAuditLog,
  getEntriesByCategory,
  getEntriesByStatus,
  getEntry,
  getFirstCategories,
  getFirstCategory,
  getRecordCategories,
  getRecordCategory,
  putCategory,
  putEntry,
  recomputeRecordStatuses,
  syncAthleteLinks,
  type EntryKind,
} from '@lib/records-service';
import {
  comparableValue,
  deriveList,
  formatRecordValue,
  LIST_LABELS,
  parseRecordValue,
  RECORD_LISTS,
  slugify,
  splitCurrentAndHistory,
} from '@lib/records-logic';
import {
  commonFieldsFrom,
  createPendingAthletes,
  firstFieldsFrom,
  isUrl,
  kindForPath,
  parseClaimValue,
  recordDetailsFrom,
  snapshotAthletes,
} from '@lib/records-claims';
import { notifyClaimEvent } from '@lib/records-notifications';
import type {
  EntryAuditRecord,
  FirstCategoryRecord,
  RecordCategoryRecord,
  RecordEntryRecord,
  RecordList,
  WorldEntryRecord,
} from '@lib/relational-types';
import type { ClaimActionResult, ClaimFormValues } from 'src/app/world_records/claim/types';

type ActionResult = { success: boolean; error?: string; notice?: string };

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const isPublicStatus = (status: WorldEntryRecord['status']) => status === 'published' || status === 'historical';

const revalidateRecordPages = () => {
  invalidateWorldRecordsCache();
  revalidatePath('/world_records');
  revalidatePath('/world_records/my-claims');
  revalidatePath('/admin/records-review');
};

// ============================================================================
// QUEUE AND DETAIL
// ============================================================================

/** Claims waiting for a decision, oldest first (FR-15). */
export async function getReviewQueue() {
  await requireRecordsPermission('records:review');
  const [records, firsts] = await Promise.all([
    getEntriesByStatus('record', 'pending'),
    getEntriesByStatus('first', 'pending'),
  ]);
  return [...records, ...firsts].sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0));
}

export interface ReviewContext {
  entry: WorldEntryRecord;
  audit: EntryAuditRecord[];
  category: RecordCategoryRecord | FirstCategoryRecord | null;
  /** Current record per list in the category, for significance (FR-18). */
  currentByList: Partial<Record<RecordList, { value: string; holders: string[]; date: string }>>;
  /** Records: other categories with similar names (FR-19). Firsts: existing firsts in the category (FR-20). */
  similar: { id: string; label: string; detail?: string }[];
  recordCategories: RecordCategoryRecord[];
  firstCategories: FirstCategoryRecord[];
  /** FR-C2: an Unchallenged category getting another record prompts the reviewer to set it Active. */
  unchallengedPrompt: boolean;
}

const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2));

/** Existing categories that share words with a proposed one, best match first (FR-19). */
function similarCategories(proposal: { name: string; measurement: string }, categories: RecordCategoryRecord[]) {
  const proposed = words(`${proposal.name} ${proposal.measurement}`);
  return categories
    .map(c => ({ c, score: [...words(c.name)].filter(w => proposed.has(w)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ c }) => ({ id: c.categoryId, label: c.name, detail: c.status }));
}

/** Everything the review screen shows next to the claim. */
export async function getReviewContext(kind: EntryKind, entryId: string): Promise<ReviewContext | null> {
  await requireRecordsPermission('records:review');
  const entry = await getEntry(kind, entryId);
  if (!entry) return null;
  const [audit, recordCategories, firstCategories] = await Promise.all([
    getAuditLog(kind, entryId),
    getRecordCategories(),
    getFirstCategories(),
  ]);

  const context: ReviewContext = {
    entry, audit, recordCategories, firstCategories,
    category: null, currentByList: {}, similar: [], unchallengedPrompt: false,
  };

  if (entry.kind === 'first') {
    context.category = firstCategories.find(c => c.categoryId === entry.categoryId) ?? null;
    const firsts = (await getEntriesByCategory('first', entry.categoryId)).filter(e => e.status === 'published');
    context.similar = firsts.map(f => ({
      id: f.entryId,
      label: `${f.trickName} (${LIST_LABELS[f.list]})`,
      detail: `${f.athletes.map(a => a.name).join(', ')}${f.trickGroupId ? ` · group ${f.trickGroupId}` : ''}`,
    }));
    return context;
  }

  const recordCategory = recordCategories.find(c => c.categoryId === entry.categoryId) ?? null;
  context.category = recordCategory;
  if (recordCategory) {
    const published = (await getEntriesByCategory('record', recordCategory.categoryId))
      .filter(e => e.status === 'published' && e.entryId !== entry.entryId);
    for (const list of RECORD_LISTS) {
      const { current } = splitCurrentAndHistory(recordCategory, published.filter(e => e.list === list));
      if (current[0]) {
        context.currentByList[list] = {
          value: formatRecordValue(recordCategory, current[0].value),
          holders: current.flatMap(e => e.athletes.map(a => a.name)),
          date: current[0].date,
        };
      }
    }
    context.unchallengedPrompt = recordCategory.status === 'unchallenged' && published.length > 0;
  } else if (entry.newCategoryProposal) {
    context.similar = similarCategories(entry.newCategoryProposal, recordCategories);
  }
  return context;
}

// ============================================================================
// DECISIONS
// ============================================================================

export interface ApproveOptions {
  /** Path b: map the claim to an existing category instead of the proposed one (FR-4b, FR-19). */
  mapToCategoryId?: string;
  /** Path b: create the proposed category; it starts as Unchallenged (FR-C3). */
  createCategory?: boolean;
  /** Firsts: link to the same trick on another list (FR-21a). */
  trickGroupWithEntryId?: string;
  comment?: string;
}

/** Creates the category a new-category claim proposed, as Unchallenged in group Other (FR-C3, FR-19). */
async function createProposedCategory(
  entry: RecordEntryRecord,
  actor: ReturnType<typeof actorOf>,
): Promise<RecordCategoryRecord> {
  const proposal = entry.newCategoryProposal!;
  const now = Date.now();
  const existing = await getRecordCategories();
  const categoryId = `${slugify(proposal.name)}-${now.toString(36)}`;
  const category: RecordCategoryRecord = {
    pk: 'RecordCategory',
    sortKey: `RecordCategory:${categoryId}`,
    categoryId,
    name: proposal.name,
    description: proposal.measurement || undefined,
    group: 'Other',
    direction: proposal.direction,
    unit: proposal.unit,
    status: 'unchallenged',
    order: Math.max(0, ...existing.map(c => c.order)) + 1,
    createdAt: now,
    updatedAt: now,
  };
  await putCategory(category);
  await addCategoryAudit(category, { action: 'created', comment: `From claim ${entry.entryId}`, ...actor });
  return category;
}

/**
 * Resolves the category a record is approved into. For a new-category claim
 * this creates the proposed category or maps the claim to an existing one, and
 * re-reads the value with that category's unit.
 */
async function resolveApprovalCategory(
  entry: RecordEntryRecord,
  options: ApproveOptions,
  actor: ReturnType<typeof actorOf>,
): Promise<{ entry: RecordEntryRecord; category: RecordCategoryRecord } | { error: string }> {
  const isProposal = !!entry.newCategoryProposal && entry.categoryId.startsWith('proposed-');
  if (!isProposal) {
    const category = await getRecordCategory(entry.categoryId);
    return category ? { entry, category } : { error: 'Category not found' };
  }

  let category: RecordCategoryRecord | null;
  if (options.mapToCategoryId) {
    category = await getRecordCategory(options.mapToCategoryId);
    if (!category) return { error: 'Category not found' };
  } else if (options.createCategory) {
    category = null; // created below, once the value is known to be readable
  } else {
    return { error: 'Create the proposed category or map the claim to an existing one' };
  }

  const rule = category ?? { unit: entry.newCategoryProposal!.unit, direction: entry.newCategoryProposal!.direction };
  const value = parseRecordValue(rule, entry.value.original ?? '');
  if (comparableValue(rule, value) === undefined) {
    return { error: `The value "${entry.value.original ?? ''}" can't be read in this category's unit. Modify the claim first.` };
  }
  category ??= await createProposedCategory(entry, actor);
  return { entry: { ...entry, categoryId: category.categoryId, categoryName: category.name, value }, category };
}

/** Links a first to the same trick on another list, for the titles (FR-21a, FR-23b). */
async function linkSameTrick(entryId: string, otherEntryId: string): Promise<string | undefined> {
  if (otherEntryId === entryId) return undefined;
  const other = await getEntry('first', otherEntryId);
  if (!other) return undefined;
  const trickGroupId = other.trickGroupId ?? `trick-${other.entryId}`;
  if (!other.trickGroupId) await putEntry({ ...other, trickGroupId, updatedAt: Date.now() });
  return trickGroupId;
}

/** Approve and publish a pending claim (FR-16, FR-21). Beaten records on the same list become historical. */
export async function approveClaim(kind: EntryKind, entryId: string, options: ApproveOptions = {}): Promise<ActionResult> {
  try {
    const session = await requireRecordsPermission('records:review');
    const actor = actorOf(session);
    let entry = await getEntry(kind, entryId);
    if (!entry) return { success: false, error: 'Claim not found' };
    if (entry.status !== 'pending') return { success: false, error: 'Only claims under review can be approved' };

    let recordCategory: RecordCategoryRecord | null = null;
    if (entry.kind === 'record') {
      const resolved = await resolveApprovalCategory(entry, options, actor);
      if ('error' in resolved) return { success: false, error: resolved.error };
      ({ entry, category: recordCategory } = resolved);
    } else if (options.trickGroupWithEntryId) {
      const trickGroupId = await linkSameTrick(entryId, options.trickGroupWithEntryId);
      if (trickGroupId) entry = { ...entry, trickGroupId };
    }

    const now = Date.now();
    const approved: WorldEntryRecord = {
      ...entry,
      athletes: await createPendingAthletes(entry),
      status: 'published',
      reviewComment: options.comment || undefined,
      decidedAt: now,
      decidedBy: actor.byName ?? actor.byUserId,
      updatedAt: now,
    };
    await putEntry(approved);
    await syncAthleteLinks(kind, entryId, entry.athletes, approved.athletes);
    await addAuditEntry(kind, entryId, { action: 'approved', fromStatus: 'pending', toStatus: 'published', comment: options.comment, ...actor });

    let supersedes: RecordEntryRecord[] = [];
    let notice: string | undefined;
    if (recordCategory) {
      // FR-21: the beaten records on the same list become historical
      const changed = await recomputeRecordStatuses(recordCategory);
      supersedes = changed.filter(e => e.status === 'historical' && e.entryId !== entryId);
      for (const old of supersedes) {
        await addAuditEntry('record', old.entryId, { action: 'superseded', fromStatus: 'published', toStatus: 'historical', comment: `Beaten by ${entryId}`, ...actor });
      }
      if (recordCategory.status === 'unchallenged') {
        notice = 'This category is Unchallenged. If it is now challenged, set it to Active on the categories page.';
      }
    }

    await notifyClaimEvent('approved', approved, { comment: options.comment, supersedes });
    revalidateRecordPages();
    return { success: true, notice };
  } catch (error) {
    console.error('Error approving claim:', error);
    return { success: false, error: errorMessage(error, 'Failed to approve') };
  }
}

/** Reject (reason required) or send back for changes (comment required), FR-16. */
async function decide(kind: EntryKind, entryId: string, toStatus: 'rejected' | 'changes_requested', comment: string): Promise<ActionResult> {
  try {
    const session = await requireRecordsPermission('records:review');
    const actor = actorOf(session);
    const text = comment.trim();
    if (!text) return { success: false, error: toStatus === 'rejected' ? 'A reason is required' : 'A comment is required' };
    const entry = await getEntry(kind, entryId);
    if (!entry || entry.status !== 'pending') return { success: false, error: 'Only claims under review can be decided' };
    const updated: WorldEntryRecord = {
      ...entry,
      status: toStatus,
      reviewComment: text,
      decidedAt: toStatus === 'rejected' ? Date.now() : entry.decidedAt,
      decidedBy: actor.byName ?? actor.byUserId,
      updatedAt: Date.now(),
    };
    await putEntry(updated);
    await addAuditEntry(kind, entryId, { action: toStatus, fromStatus: 'pending', toStatus, comment: text, ...actor });
    await notifyClaimEvent(toStatus, updated, { comment: text });
    revalidateRecordPages();
    return { success: true };
  } catch (error) {
    console.error(`Error setting claim to ${toStatus}:`, error);
    return { success: false, error: errorMessage(error, 'Failed to update the claim') };
  }
}

export async function rejectClaim(kind: EntryKind, entryId: string, reason: string) {
  return decide(kind, entryId, 'rejected', reason);
}

export async function requestClaimChanges(kind: EntryKind, entryId: string, comment: string) {
  return decide(kind, entryId, 'changes_requested', comment);
}

/**
 * Admin: void a published entry (e.g. a fair-play violation found later) or
 * restore a voided one. Claims rejected in review can't be restored: they never
 * went through approval. Records re-derive published / historical afterwards.
 */
export async function setPublicEntryStatus(kind: EntryKind, entryId: string, toStatus: 'published' | 'rejected', comment: string): Promise<ActionResult> {
  try {
    const session = await requireRecordsPermission('records:manage');
    const text = comment.trim();
    if (!text) return { success: false, error: 'A reason is required' };
    const entry = await getEntry(kind, entryId);
    if (!entry) return { success: false, error: 'Entry not found' };
    const voiding = toStatus === 'rejected';
    const allowed = voiding ? isPublicStatus(entry.status) : entry.status === 'rejected' && entry.voidedAt !== undefined;
    if (!allowed) return { success: false, error: `Cannot change a ${entry.status} entry to ${toStatus}` };

    await putEntry({
      ...entry,
      status: toStatus,
      reviewComment: text,
      voidedAt: voiding ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
    await addAuditEntry(kind, entryId, {
      action: voiding ? 'voided' : 'restored',
      fromStatus: entry.status,
      toStatus,
      comment: text,
      ...actorOf(session),
    });
    if (entry.kind === 'record') {
      const category = await getRecordCategory(entry.categoryId);
      if (category) await recomputeRecordStatuses(category);
    }
    revalidateRecordPages();
    return { success: true };
  } catch (error) {
    console.error('Error changing entry status:', error);
    return { success: false, error: errorMessage(error, 'Failed to change the status') };
  }
}

// ============================================================================
// MODIFY (FR-17)
// ============================================================================

/**
 * Admin "Modify": edit every detail of a record or first with the claim form
 * fields. Status, claimant and the claimant's confirmations stay as they are.
 */
export async function adminUpdateEntry(kind: EntryKind, entryId: string, values: ClaimFormValues, comment: string): Promise<ClaimActionResult> {
  try {
    const session = await requireRecordsPermission('records:review');
    const entry = await getEntry(kind, entryId);
    if (!entry) return { success: false, errors: ['Entry not found'] };
    const isPublic = isPublicStatus(entry.status);
    if (isPublic) await requireRecordsPermission('records:manage');
    if (kindForPath(values.path) !== kind) return { success: false, errors: ['A record cannot become a first or the other way round'] };

    const { athletes, errors } = await snapshotAthletes(values);
    if (athletes.length === 0 && errors.length === 0) errors.push('Add at least one athlete');
    const common = commonFieldsFrom(values);
    for (const { url } of common.evidence) if (!isUrl(url)) errors.push(`"${url}" is not a valid link`);

    const shared = {
      ...common,
      athletes,
      list: athletes.length > 0 ? deriveList(athletes) : entry.list,
      updatedAt: Date.now(),
    };

    let updated: WorldEntryRecord;
    if (entry.kind === 'first') {
      const category = await getFirstCategory(values.categoryId);
      if (!category) errors.push('Choose a discipline');
      if (!values.trickName.trim()) errors.push('Trick name is required');
      updated = {
        ...entry,
        ...shared,
        categoryId: values.categoryId,
        categoryName: category?.name ?? entry.categoryName,
        ...firstFieldsFrom(values),
      };
    } else {
      const proposing = values.path === 'new_category';
      if (proposing && (isPublic || !entry.newCategoryProposal)) errors.push('Only a claim under review can propose a new category; choose an existing category');
      const recordCategory = proposing ? null : await getRecordCategory(values.categoryId);
      if (!proposing && !recordCategory) errors.push('Choose a record category');
      const { value, readable } = parseClaimValue(values, recordCategory);
      if (!readable) errors.push(`Could not read the value "${values.valueText}"`);
      updated = {
        ...entry,
        ...shared,
        categoryId: proposing ? entry.categoryId : values.categoryId,
        categoryName: proposing ? values.newCategory.name.trim() : recordCategory?.name ?? entry.categoryName,
        newCategoryProposal: proposing ? { ...values.newCategory } : undefined,
        value,
        ...recordDetailsFrom(values),
      };
    }
    if (errors.length > 0) return { success: false, errors };

    // New athletes on a published entry get their profile right away (FR-9)
    if (isPublic) updated = { ...updated, athletes: await createPendingAthletes(updated) };
    await putEntry(updated);
    await syncAthleteLinks(kind, entryId, entry.athletes, updated.athletes);

    const changed = Object.keys(updated).filter(k =>
      k !== 'updatedAt' && JSON.stringify((updated as unknown as Record<string, unknown>)[k]) !== JSON.stringify((entry as unknown as Record<string, unknown>)[k]));
    await addAuditEntry(kind, entryId, {
      action: 'modified',
      comment: [`Changed: ${changed.join(', ') || 'nothing'}`, comment.trim()].filter(Boolean).join('. '),
      ...actorOf(session),
    });

    if (updated.kind === 'record' && entry.kind === 'record' && isPublic) {
      for (const id of new Set([entry.categoryId, updated.categoryId])) {
        const category = await getRecordCategory(id);
        if (category) await recomputeRecordStatuses(category);
      }
    }
    revalidateRecordPages();
    revalidatePath(`/admin/records-review/${kind}/${entryId}`);
    return { success: true, entryId, kind, message: 'Saved.' };
  } catch (error) {
    console.error('Error modifying entry:', error);
    return { success: false, errors: [errorMessage(error, 'Failed to save')] };
  }
}
