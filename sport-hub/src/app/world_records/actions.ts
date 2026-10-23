'use server';

import { revalidatePath } from 'next/cache';
import { USERS_TABLE } from '@lib/dynamodb';
import { requireRecordsPermission, requireSession } from '@lib/records-auth';
import { getUser } from '@lib/user-service';
import { invalidateWorldRecordsCache } from '@lib/data-services';
import { createUser } from '@ui/UserForm/actions';
import { normalizeGender } from '@utils/gender';
import {
  addAuditEntry,
  addCategoryAudit,
  deleteEntry,
  deleteItems,
  entryPk,
  getAuditLog,
  getEntriesByCategory,
  getEntriesByStatus,
  getEntry,
  getFirstCategories,
  getFirstCategory,
  getRecordCategories,
  getRecordCategory,
  getUserClaims,
  putAthleteLink,
  putCategory,
  putClaimantLink,
  putEntry,
  recomputeRecordStatuses,
  type EntryKind,
} from '@lib/records-service';
import {
  compareRecordValues,
  comparableValue,
  deriveList,
  formatRecordValue,
  LIST_LABELS,
  parseRecordValue,
  splitCurrentAndHistory,
} from '@lib/records-logic';
import { MIN_WITNESSES } from '@lib/records-rules';
import { notifyClaimEvent } from '@lib/records-notifications';
import type {
  ClaimStatus,
  EntryAthlete,
  EntryAuditRecord,
  FirstCategoryRecord,
  FirstEntryRecord,
  RecordCategoryRecord,
  RecordEntryRecord,
  RecordList,
  WorldEntryRecord,
} from '@lib/relational-types';
import type { ClaimActionResult, ClaimFormValues } from './claim/types';

// ============================================================================
// HELPERS
// ============================================================================

const kindForPath = (path: ClaimFormValues['path']): EntryKind => (path === 'first' ? 'first' : 'record');

const newEntryId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Records without a full video have no video links (the form hides them). */
const evidenceLinks = (values: ClaimFormValues) =>
  values.path !== 'first' && !values.fullVideo ? [] : values.evidence.map(l => l.trim()).filter(Boolean);

const isUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

const revalidateRecordPages = () => {
  invalidateWorldRecordsCache();
  revalidatePath('/world_records');
  revalidatePath('/world_records/my-claims');
  revalidatePath('/admin/records-review');
};

/**
 * Gender and country come from the athlete's profile, copied onto the claim at
 * submission (FR-9a). New athletes bring them on the claim (FR-9). Only male or
 * female is accepted for now (FR-9d).
 */
async function snapshotAthletes(values: ClaimFormValues): Promise<{ athletes: EntryAthlete[]; errors: string[] }> {
  const errors: string[] = [];
  const athletes: EntryAthlete[] = [];
  for (const athlete of values.athletes) {
    if (athlete.userId) {
      const profile = await getUser(athlete.userId);
      if (!profile) { errors.push(`Athlete ${athlete.name || athlete.userId} was not found`); continue; }
      const name = [profile.name, profile.surname].filter(Boolean).join(' ') || athlete.name;
      const gender = normalizeGender(profile.gender);
      if (gender !== 'MEN' && gender !== 'WOMEN') {
        errors.push(`${name} has no male or female gender on their profile. They need to set it before the claim can be submitted.`);
        continue;
      }
      athletes.push({ userId: profile.userId, name, gender, country: profile.country });
    } else if (athlete.pendingUser) {
      const p = athlete.pendingUser;
      const name = [p.name, p.surname].filter(Boolean).join(' ');
      const gender = normalizeGender(p.gender);
      if (!p.name || !p.surname || !p.email) { errors.push('New athletes need a name, surname and email'); continue; }
      if (gender !== 'MEN' && gender !== 'WOMEN') { errors.push(`Choose male or female for ${name}`); continue; }
      athletes.push({ name, gender, country: p.country, pendingUser: p });
    } else if (athlete.name) {
      errors.push(`Pick "${athlete.name}" from the SportHub users or add them as a new athlete`);
    }
  }
  if (athletes.length === 0 && errors.length === 0) errors.push('Add at least one athlete');
  return { athletes, errors };
}

/** Current mark on one list of a category (best published value, ties are co-holders). */
async function currentOnList(category: RecordCategoryRecord, list: RecordList): Promise<RecordEntryRecord[]> {
  const entries = (await getEntriesByCategory(category.categoryId))
    .filter((e): e is RecordEntryRecord => e.kind === 'record' && e.status === 'published' && e.list === list);
  return splitCurrentAndHistory(category, entries).current;
}

// ============================================================================
// CLAIMANT: lookups for the form
// ============================================================================

export async function getClaimFormOptions() {
  const [recordCategories, firstCategories] = await Promise.all([getRecordCategories(), getFirstCategories()]);
  return {
    // Archived categories are not offered (FR-C4)
    recordCategories: recordCategories.filter(c => c.status !== 'archived'),
    firstCategories: firstCategories.filter(c => c.status !== 'archived'),
  };
}

/** The mark to beat on the list the chosen athletes go on (FR-5). */
export async function getMarkToBeat(categoryId: string, genders: ('MEN' | 'WOMEN')[]) {
  const category = await getRecordCategory(categoryId);
  if (!category || genders.length === 0) return null;
  const list = deriveList(genders.map(gender => ({ gender })));
  const current = await currentOnList(category, list);
  return {
    list,
    listLabel: LIST_LABELS[list],
    value: current[0] ? formatRecordValue(category, current[0].value) : null,
    holders: current.flatMap(e => e.athletes.map(a => a.name)),
  };
}

/** Genders of picked SportHub users, so the form can show the list and mark to beat. */
export async function getAthleteGenders(userIds: string[]) {
  const profiles = await Promise.all(userIds.map(id => getUser(id)));
  return Object.fromEntries(profiles.filter(Boolean).map(p => [p!.userId, normalizeGender(p!.gender) ?? null]));
}

// ============================================================================
// CLAIMANT: save, submit, withdraw
// ============================================================================

function validateForSubmit(
  values: ClaimFormValues,
  kind: EntryKind,
  recordCategory: RecordCategoryRecord | null,
  firstCategory: FirstCategoryRecord | null,
  athletes: EntryAthlete[],
  claimantId: string,
): string[] {
  const errors: string[] = [];
  const required = (value: string, label: string) => { if (!value?.trim()) errors.push(`${label} is required`); };

  if (athletes.length > 1 && !values.jointConfirmed) {
    errors.push('Confirm that the athletes did this as one joint performance. Co-holders who did it separately submit their own claims.');
  }
  const claimantIsOnlyAthlete = athletes.length === 1 && athletes[0].userId === claimantId;
  if (!claimantIsOnlyAthlete && !values.consentConfirmed) {
    errors.push('Confirm that you have the consent of every athlete on this claim');
  }

  const links = evidenceLinks(values);
  if (links.length === 0 && (kind === 'first' || values.fullVideo)) errors.push(kind === 'first' ? 'Add at least one video link showing the trick being landed' : 'Add at least one video link');
  for (const link of links) if (!isUrl(link)) errors.push(`"${link}" is not a valid link`);

  required(values.date, 'Date');
  if (values.date && values.date > new Date().toISOString().slice(0, 10)) errors.push('The date cannot be in the future');
  if (!values.ethicsConfirmed) errors.push('Confirm the ISA ethics guidelines and Code of Conduct');

  if (kind === 'first') {
    if (!firstCategory || firstCategory.status === 'archived') errors.push('Choose a first category');
    required(values.trickName, 'Trick name');
    required(values.description, 'Description');
    required(values.whyFirst, 'Why it is a first');
    return errors;
  }

  if (values.path === 'existing') {
    if (!recordCategory || recordCategory.status === 'archived') errors.push('Choose a record category');
  } else {
    required(values.newCategory.name, 'Category name');
    required(values.newCategory.measurement, 'What is measured and how');
    required(values.newCategory.justification, 'Why it is a distinct record');
  }
  required(values.valueText, 'Record value');
  required(values.locationName, 'Location');
  required(values.locationCountry, 'Country of the location');

  const witnesses = values.witnesses.filter(w => w.name.trim() || w.email.trim() || w.phone?.trim());
  if (witnesses.length < MIN_WITNESSES) errors.push(`Name at least ${MIN_WITNESSES} witnesses`);
  if (witnesses.some(w => !w.name.trim() || !w.email.trim())) errors.push('Each witness needs a name and an email');
  if (witnesses.some(w => w.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(w.email.trim()))) errors.push('Enter a valid email for each witness');
  if (!values.fullVideo && !values.noFullVideoReason.trim()) errors.push('Explain why there is no full video');

  return errors;
}

/**
 * Saves a draft, or submits (draft / changes requested → pending).
 * The claimant is the signed-in user; only they can edit their claim.
 */
export async function saveClaim(values: ClaimFormValues, intent: 'draft' | 'submit'): Promise<ClaimActionResult> {
  try {
    const session = await requireSession();
    const claimantId = session.user.id;
    const kind = kindForPath(values.path);

    const existing = values.entryId ? await getEntry(kind as 'record', values.entryId) as WorldEntryRecord | null : null;
    if (existing && existing.claimantUserId !== claimantId) return { success: false, errors: ['You can only edit your own claims'] };
    if (existing && !['draft', 'changes_requested'].includes(existing.status)) {
      return { success: false, errors: ['This claim can no longer be edited'] };
    }

    const [recordCategory, firstCategory] = await Promise.all([
      kind === 'record' && values.path === 'existing' && values.categoryId ? getRecordCategory(values.categoryId) : null,
      kind === 'first' && values.categoryId ? getFirstCategory(values.categoryId) : null,
    ]);

    const { athletes, errors: athleteErrors } = await snapshotAthletes(values);
    const submit = intent === 'submit';
    const errors = submit
      ? [...athleteErrors, ...validateForSubmit(values, kind, recordCategory, firstCategory, athletes, claimantId)]
      : [];

    const entryId = existing?.entryId ?? newEntryId();
    const now = Date.now();
    const list = athletes.length > 0 ? deriveList(athletes) : 'MEN';
    const base = {
      pk: '', sortKey: 'Metadata' as const, statusKey: '', dateSortKey: '',
      entryId,
      status: (submit ? 'pending' : existing?.status ?? 'draft') as ClaimStatus,
      list,
      athletes,
      date: values.date,
      locationName: values.locationName.trim() || undefined,
      locationCountry: values.locationCountry || undefined,
      eventId: values.eventId || undefined,
      evidence: evidenceLinks(values).map(url => ({ type: 'link' as const, url })),
      ethicsConfirmed: values.ethicsConfirmed,
      consentConfirmed: values.consentConfirmed,
      claimantUserId: claimantId,
      claimantName: session.user.name ?? session.user.email ?? claimantId,
      source: 'claim' as const,
      reviewComment: existing?.reviewComment,
      submittedAt: submit ? now : existing?.submittedAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    let entry: WorldEntryRecord;
    if (kind === 'first') {
      entry = {
        ...base,
        kind: 'first',
        categoryId: values.categoryId,
        categoryName: firstCategory?.name ?? '',
        trickName: values.trickName.trim(),
        description: values.description.trim() || undefined,
        whyFirst: values.whyFirst.trim() || undefined,
        similarTricks: values.similarTricks.trim() || undefined,
        lineDetails: values.lineDetails.trim() || undefined,
      } satisfies FirstEntryRecord;
    } else {
      const isNew = values.path === 'new_category';
      const unitSource = isNew ? { unit: values.newCategory.unit } : recordCategory ?? { unit: 'm' };
      const value = parseRecordValue(unitSource, values.valueText);
      if (submit && values.valueText && comparableValue({ direction: 'higher', unit: unitSource.unit }, value) === undefined) {
        errors.push(`Could not read the value "${values.valueText}"`);
      }
      entry = {
        ...base,
        kind: 'record',
        categoryId: isNew ? `proposed-${entryId}` : values.categoryId,
        categoryName: isNew ? values.newCategory.name.trim() : recordCategory?.name ?? '',
        value,
        setup: values.setup.trim() || undefined,
        furtherSpecs: values.furtherSpecs.trim() || undefined,
        witnesses: values.witnesses
          .filter(w => w.name.trim() || w.email.trim() || w.phone?.trim())
          .map(w => ({ name: w.name.trim(), email: w.email.trim(), phone: w.phone?.trim() || undefined })),
        noFullVideoReason: values.fullVideo ? undefined : values.noFullVideoReason.trim(),
        newCategoryProposal: isNew ? { ...values.newCategory } : undefined,
      } satisfies RecordEntryRecord;

      // The value must beat or equal the current mark on its list (FR-5)
      if (submit && recordCategory && athletes.length > 0 && errors.length === 0) {
        const current = await currentOnList(recordCategory, list);
        if (current[0] && compareRecordValues(recordCategory, value, current[0].value) < 0) {
          errors.push(`The current ${LIST_LABELS[list].toLowerCase()} record is ${formatRecordValue(recordCategory, current[0].value)}. A claim has to beat or equal it.`);
        }
      }
    }

    if (errors.length > 0) return { success: false, errors };

    await putEntry(entry);
    if (!existing) await putClaimantLink(claimantId, kind, entryId);
    if (submit) {
      for (const athlete of athletes) if (athlete.userId) await putAthleteLink(athlete.userId, kind, entryId);
      await addAuditEntry(kind, entryId, {
        action: existing?.status === 'changes_requested' ? 'resubmitted' : 'submitted',
        fromStatus: existing?.status ?? 'draft',
        toStatus: 'pending',
        byUserId: claimantId,
        byName: base.claimantName,
      });
      await notifyClaimEvent('submitted', entry);
    } else if (!existing) {
      await addAuditEntry(kind, entryId, { action: 'created', toStatus: 'draft', byUserId: claimantId, byName: base.claimantName });
    }

    revalidatePath('/world_records/my-claims');
    revalidatePath('/admin/records-review');
    return {
      success: true,
      entryId,
      kind,
      message: submit ? 'Your claim was sent to the ISA for review.' : 'Draft saved.',
    };
  } catch (error) {
    console.error('Error saving claim:', error);
    return { success: false, errors: [error instanceof Error ? error.message : 'Failed to save the claim'] };
  }
}

/** Withdraw a pending claim back to draft (FR-8). */
export async function withdrawClaim(kind: EntryKind, entryId: string): Promise<ClaimActionResult> {
  try {
    const session = await requireSession();
    const entry = await getEntry(kind as 'record', entryId) as WorldEntryRecord | null;
    if (!entry || entry.claimantUserId !== session.user.id) return { success: false, errors: ['Claim not found'] };
    if (entry.status !== 'pending') return { success: false, errors: ['Only claims under review can be withdrawn'] };
    await putEntry({ ...entry, status: 'draft', updatedAt: Date.now() });
    await addAuditEntry(kind, entryId, { action: 'withdrawn', fromStatus: 'pending', toStatus: 'draft', byUserId: session.user.id, byName: entry.claimantName });
    revalidatePath('/world_records/my-claims');
    revalidatePath('/admin/records-review');
    return { success: true, entryId, kind, message: 'Claim withdrawn. It is a draft again.' };
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : 'Failed to withdraw'] };
  }
}

/** Delete a draft for good. Only the claimant can, and only while it is a draft. */
export async function deleteDraft(kind: EntryKind, entryId: string): Promise<ClaimActionResult> {
  try {
    const session = await requireSession();
    const entry = await getEntry(kind as 'record', entryId) as WorldEntryRecord | null;
    if (!entry || entry.claimantUserId !== session.user.id) return { success: false, errors: ['Claim not found'] };
    if (entry.status !== 'draft') return { success: false, errors: ['Only drafts can be deleted'] };
    await deleteEntry(entry);
    revalidatePath('/world_records/my-claims');
    return { success: true, entryId, kind, message: 'Draft deleted.' };
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : 'Failed to delete the draft'] };
  }
}

/** Claims the signed-in user made or is an athlete on. */
export async function getMyClaims(): Promise<WorldEntryRecord[]> {
  const session = await requireSession();
  const userId = session.user.id;
  return (await getUserClaims(userId)).filter(e =>
    e.claimantUserId === userId || e.athletes.some(a => a.userId === userId));
}

/** A claim for the edit form; only the claimant can open their draft. */
export async function getOwnClaim(kind: EntryKind, entryId: string): Promise<WorldEntryRecord | null> {
  const session = await requireSession();
  const entry = await getEntry(kind as 'record', entryId) as WorldEntryRecord | null;
  return entry && entry.claimantUserId === session.user.id ? entry : null;
}

// ============================================================================
// REVIEWER
// ============================================================================

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

export async function getReviewContext(kind: EntryKind, entryId: string): Promise<ReviewContext | null> {
  await requireRecordsPermission('records:review');
  const entry = await getEntry(kind as 'record', entryId) as WorldEntryRecord | null;
  if (!entry) return null;
  const [audit, recordCategories, firstCategories] = await Promise.all([
    getAuditLog(kind, entryId),
    getRecordCategories(),
    getFirstCategories(),
  ]);

  const currentByList: ReviewContext['currentByList'] = {};
  let similar: ReviewContext['similar'] = [];
  let category: ReviewContext['category'] = null;
  let unchallengedPrompt = false;

  if (entry.kind === 'record') {
    const recordCategory = recordCategories.find(c => c.categoryId === entry.categoryId) ?? null;
    category = recordCategory;
    if (recordCategory) {
      const entries = (await getEntriesByCategory(recordCategory.categoryId))
        .filter((e): e is RecordEntryRecord => e.kind === 'record' && e.status === 'published');
      for (const list of ['MEN', 'WOMEN', 'MIXED'] as RecordList[]) {
        const { current } = splitCurrentAndHistory(recordCategory, entries.filter(e => e.list === list && e.entryId !== entry.entryId));
        if (current[0]) {
          currentByList[list] = {
            value: formatRecordValue(recordCategory, current[0].value),
            holders: current.flatMap(e => e.athletes.map(a => a.name)),
            date: current[0].date,
          };
        }
      }
      unchallengedPrompt = recordCategory.status === 'unchallenged' && entries.some(e => e.entryId !== entry.entryId);
    } else if (entry.newCategoryProposal) {
      const proposal = words(`${entry.newCategoryProposal.name} ${entry.newCategoryProposal.measurement}`);
      similar = recordCategories
        .map(c => ({ c, score: [...words(c.name)].filter(w => proposal.has(w)).length }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ c }) => ({ id: c.categoryId, label: c.name, detail: c.status }));
    }
  } else {
    category = firstCategories.find(c => c.categoryId === entry.categoryId) ?? null;
    const firsts = (await getEntriesByCategory(entry.categoryId))
      .filter((e): e is FirstEntryRecord => e.kind === 'first' && e.status === 'published');
    similar = firsts.map(f => ({
      id: f.entryId,
      label: `${f.trickName} (${LIST_LABELS[f.list]})`,
      detail: `${f.athletes.map(a => a.name).join(', ')}${f.trickGroupId ? ` · group ${f.trickGroupId}` : ''}`,
    }));
  }

  return { entry, audit, category, currentByList, similar, recordCategories, firstCategories, unchallengedPrompt };
}

/** Creates SportHub profiles for new athletes on a claim and links them (FR-9). */
async function createPendingAthletes(entry: WorldEntryRecord): Promise<EntryAthlete[]> {
  const athletes: EntryAthlete[] = [];
  for (const athlete of entry.athletes) {
    if (athlete.userId || !athlete.pendingUser) { athletes.push(athlete); continue; }
    const p = athlete.pendingUser;
    const userId = `athlete-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await createUser({
      id: userId,
      name: p.name,
      surname: p.surname,
      email: p.email,
      gender: athlete.gender === 'WOMEN' ? 'female' : 'male',
      country: p.country,
      city: p.city,
      birthdate: p.birthdate,
      isaId: '',
    }, '/admin/records-review');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pendingUser: _created, ...rest } = athlete;
    athletes.push({ ...rest, userId });
  }
  return athletes;
}

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export interface ApproveOptions {
  /** Path b: map the claim to an existing category instead of the proposed one (FR-4b, FR-19). */
  mapToCategoryId?: string;
  /** Path b: create the proposed category; it starts as Unchallenged (FR-C3). */
  createCategory?: boolean;
  /** Firsts: link to the same trick on another list (FR-21a). */
  trickGroupWithEntryId?: string;
  comment?: string;
}

export async function approveClaim(kind: EntryKind, entryId: string, options: ApproveOptions = {}) {
  try {
    const session = await requireRecordsPermission('records:review');
    let entry = await getEntry(kind as 'record', entryId) as WorldEntryRecord | null;
    if (!entry) return { success: false, error: 'Claim not found' };
    if (entry.status !== 'pending') return { success: false, error: 'Only claims under review can be approved' };

    const reviewer = { byUserId: session.user.id, byName: session.user.name ?? session.user.email ?? undefined };
    let recordCategory: RecordCategoryRecord | null = null;
    let notice: string | undefined;

    if (entry.kind === 'record') {
      if (entry.newCategoryProposal && entry.categoryId.startsWith('proposed-')) {
        if (options.mapToCategoryId) {
          recordCategory = await getRecordCategory(options.mapToCategoryId);
          if (!recordCategory) return { success: false, error: 'Category not found' };
        } else if (options.createCategory) {
          const proposal = entry.newCategoryProposal;
          const now = Date.now();
          const existing = await getRecordCategories();
          recordCategory = {
            pk: 'RecordCategory',
            sortKey: '',
            categoryId: `${slugify(proposal.name)}-${now.toString(36)}`,
            name: proposal.name,
            description: proposal.measurement || undefined,
            group: 'Other',
            direction: proposal.direction,
            unit: proposal.unit,
            status: 'unchallenged',
            order: existing.length,
            createdAt: now,
            updatedAt: now,
          };
          recordCategory.sortKey = `RecordCategory:${recordCategory.categoryId}`;
          await putCategory(recordCategory);
          await addCategoryAudit(recordCategory, { action: 'created', comment: `From claim ${entryId}`, ...reviewer });
        } else {
          return { success: false, error: 'Create the proposed category or map the claim to an existing one' };
        }
        entry = {
          ...entry,
          categoryId: recordCategory.categoryId,
          categoryName: recordCategory.name,
          value: parseRecordValue(recordCategory, entry.value.original ?? ''),
        };
      } else {
        recordCategory = await getRecordCategory(entry.categoryId);
      }
      if (!recordCategory) return { success: false, error: 'Category not found' };
    } else if (options.trickGroupWithEntryId) {
      const other = await getEntry('first', options.trickGroupWithEntryId);
      if (other) {
        const trickGroupId = other.trickGroupId ?? `trick-${other.entryId}`;
        if (!other.trickGroupId) await putEntry({ ...other, trickGroupId, updatedAt: Date.now() });
        entry = { ...entry, trickGroupId };
      }
    }

    const athletes = await createPendingAthletes(entry);
    const approved: WorldEntryRecord = {
      ...entry,
      athletes,
      status: 'published',
      reviewComment: options.comment || undefined,
      decidedAt: Date.now(),
      decidedBy: reviewer.byName ?? reviewer.byUserId,
      updatedAt: Date.now(),
    };
    await putEntry(approved);
    for (const athlete of athletes) if (athlete.userId) await putAthleteLink(athlete.userId, kind, entryId);
    await addAuditEntry(kind, entryId, { action: 'approved', fromStatus: 'pending', toStatus: 'published', comment: options.comment, ...reviewer });

    let supersedes: RecordEntryRecord[] = [];
    if (recordCategory) {
      // FR-21: the beaten records on the same list become historical
      const changed = await recomputeRecordStatuses(recordCategory);
      supersedes = changed.filter(e => e.status === 'historical' && e.entryId !== entryId);
      for (const old of supersedes) {
        await addAuditEntry('record', old.entryId, { action: 'superseded', fromStatus: 'published', toStatus: 'historical', comment: `Beaten by ${entryId}`, ...reviewer });
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
    return { success: false, error: error instanceof Error ? error.message : 'Failed to approve' };
  }
}

async function decide(kind: EntryKind, entryId: string, toStatus: 'rejected' | 'changes_requested', comment: string) {
  try {
    const session = await requireRecordsPermission('records:review');
    if (!comment.trim()) return { success: false, error: toStatus === 'rejected' ? 'A reason is required' : 'A comment is required' };
    const entry = await getEntry(kind as 'record', entryId) as WorldEntryRecord | null;
    if (!entry || entry.status !== 'pending') return { success: false, error: 'Only claims under review can be decided' };
    const reviewer = { byUserId: session.user.id, byName: session.user.name ?? session.user.email ?? undefined };
    const updated: WorldEntryRecord = {
      ...entry,
      status: toStatus,
      reviewComment: comment.trim(),
      decidedAt: toStatus === 'rejected' ? Date.now() : entry.decidedAt,
      decidedBy: reviewer.byName ?? reviewer.byUserId,
      updatedAt: Date.now(),
    };
    await putEntry(updated);
    await addAuditEntry(kind, entryId, { action: toStatus, fromStatus: 'pending', toStatus, comment: comment.trim(), ...reviewer });
    await notifyClaimEvent(toStatus, updated, { comment: comment.trim() });
    revalidateRecordPages();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update the claim' };
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
 * restore it. Records re-derive published / historical afterwards.
 */
export async function setPublicEntryStatus(kind: EntryKind, entryId: string, toStatus: 'published' | 'rejected', comment: string) {
  try {
    const session = await requireRecordsPermission('records:manage');
    if (!comment.trim()) return { success: false, error: 'A reason is required' };
    const entry = await getEntry(kind as 'record', entryId) as WorldEntryRecord | null;
    if (!entry) return { success: false, error: 'Entry not found' };
    const allowed = toStatus === 'rejected'
      ? ['published', 'historical'].includes(entry.status)
      : entry.status === 'rejected' && entry.decidedAt !== undefined;
    if (!allowed) return { success: false, error: `Cannot change a ${entry.status} entry to ${toStatus}` };

    await putEntry({ ...entry, status: toStatus, reviewComment: comment.trim(), updatedAt: Date.now() });
    await addAuditEntry(kind, entryId, {
      action: toStatus === 'rejected' ? 'voided' : 'restored',
      fromStatus: entry.status,
      toStatus,
      comment: comment.trim(),
      byUserId: session.user.id,
      byName: session.user.name ?? session.user.email ?? undefined,
    });
    if (entry.kind === 'record') {
      const category = await getRecordCategory(entry.categoryId);
      if (category) await recomputeRecordStatuses(category);
    }
    revalidateRecordPages();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to change the status' };
  }
}

/**
 * Admin "Modify": edit every detail of a record or first with the claim form
 * fields. Status, claimant and the claimant's confirmations stay as they are.
 */
export async function adminUpdateEntry(kind: EntryKind, entryId: string, values: ClaimFormValues, comment: string): Promise<ClaimActionResult> {
  try {
    const session = await requireRecordsPermission('records:review');
    const entry = await getEntry(kind as 'record', entryId) as WorldEntryRecord | null;
    if (!entry) return { success: false, errors: ['Entry not found'] };
    const isPublic = entry.status === 'published' || entry.status === 'historical';
    if (isPublic && !(session.user.role === 'admin' || session.user.permissions?.includes('records:manage'))) {
      return { success: false, errors: ['Missing permission records:manage'] };
    }
    if (kindForPath(values.path) !== kind) return { success: false, errors: ['A record cannot become a first or the other way round'] };

    const { athletes, errors } = await snapshotAthletes(values);
    if (athletes.length === 0 && errors.length === 0) errors.push('Add at least one athlete');
    const links = evidenceLinks(values);
    for (const link of links) if (!isUrl(link)) errors.push(`"${link}" is not a valid link`);

    const common = {
      athletes,
      list: athletes.length > 0 ? deriveList(athletes) : entry.list,
      date: values.date,
      locationName: values.locationName.trim() || undefined,
      locationCountry: values.locationCountry || undefined,
      eventId: values.eventId || undefined,
      evidence: links.map(url => ({ type: 'link' as const, url })),
      updatedAt: Date.now(),
    };

    let updated: WorldEntryRecord;
    let recordCategory: RecordCategoryRecord | null = null;
    if (entry.kind === 'first') {
      const category = await getFirstCategory(values.categoryId);
      if (!category) errors.push('Choose a discipline');
      if (!values.trickName.trim()) errors.push('Trick name is required');
      updated = {
        ...entry,
        ...common,
        categoryId: values.categoryId,
        categoryName: category?.name ?? entry.categoryName,
        trickName: values.trickName.trim(),
        description: values.description.trim() || undefined,
        whyFirst: values.whyFirst.trim() || undefined,
        similarTricks: values.similarTricks.trim() || undefined,
        lineDetails: values.lineDetails.trim() || undefined,
      };
    } else {
      const proposing = values.path === 'new_category';
      if (proposing && (isPublic || !entry.newCategoryProposal)) errors.push('Only a claim under review can propose a new category; choose an existing category');
      recordCategory = proposing ? null : await getRecordCategory(values.categoryId);
      if (!proposing && !recordCategory) errors.push('Choose a record category');
      const unitSource = proposing ? { unit: values.newCategory.unit } : recordCategory ?? { unit: 'm' };
      const value = parseRecordValue(unitSource, values.valueText);
      if (comparableValue({ direction: 'higher', unit: unitSource.unit }, value) === undefined) errors.push(`Could not read the value "${values.valueText}"`);
      updated = {
        ...entry,
        ...common,
        categoryId: proposing ? entry.categoryId : values.categoryId,
        categoryName: proposing ? values.newCategory.name.trim() : recordCategory?.name ?? entry.categoryName,
        newCategoryProposal: proposing ? { ...values.newCategory } : undefined,
        value,
        setup: values.setup.trim() || undefined,
        furtherSpecs: values.furtherSpecs.trim() || undefined,
        witnesses: values.witnesses
          .filter(w => w.name.trim() || w.email.trim() || w.phone?.trim())
          .map(w => ({ name: w.name.trim(), email: w.email.trim(), phone: w.phone?.trim() || undefined })),
        noFullVideoReason: values.fullVideo ? undefined : values.noFullVideoReason.trim() || undefined,
      };
    }
    if (errors.length > 0) return { success: false, errors };

    // New athletes on a published entry get their profile right away (FR-9)
    if (isPublic) updated = { ...updated, athletes: await createPendingAthletes(updated) };
    await putEntry(updated);

    // Keep the athletes' profile pointers in step with the athletes on the entry
    const before = new Set(entry.athletes.map(a => a.userId).filter(Boolean) as string[]);
    const after = new Set(updated.athletes.map(a => a.userId).filter(Boolean) as string[]);
    const removed = [...before].filter(id => !after.has(id));
    if (removed.length > 0) await deleteItems(USERS_TABLE, removed.map(userId => ({ userId, sortKey: entryPk(kind, entryId) })));
    if (isPublic || entry.status === 'pending') {
      for (const userId of after) if (!before.has(userId)) await putAthleteLink(userId, kind, entryId);
    }

    const changed = Object.keys(updated).filter(k =>
      k !== 'updatedAt' && JSON.stringify((updated as unknown as Record<string, unknown>)[k]) !== JSON.stringify((entry as unknown as Record<string, unknown>)[k]));
    await addAuditEntry(kind, entryId, {
      action: 'modified',
      comment: [`Changed: ${changed.join(', ') || 'nothing'}`, comment.trim()].filter(Boolean).join('. '),
      byUserId: session.user.id,
      byName: session.user.name ?? session.user.email ?? undefined,
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
    return { success: false, errors: [error instanceof Error ? error.message : 'Failed to save'] };
  }
}
