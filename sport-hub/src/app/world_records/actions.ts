'use server';

/**
 * Claimant server actions: the claim form's lookups, saving and submitting a
 * claim, withdrawing it and deleting a draft (requirements §7.2). Every action
 * needs a signed-in user, and a claim can only be changed by its claimant.
 * Reviewer and admin actions are in src/app/admin/records-review/actions.ts.
 */

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { actorOf, hasRecordsPermission, requireSession } from '@lib/records-auth';
import { getUser } from '@lib/user-service';
import { normalizeGender } from '@utils/gender';
import {
  addAuditEntry,
  countSubmission,
  deleteEntry,
  getEntry,
  getFirstCategories,
  getFirstCategory,
  getRecordCategories,
  getRecordCategory,
  getUserClaims,
  putClaimantLink,
  putEntry,
  syncAthleteLinks,
  type EntryKind,
} from '@lib/records-service';
import { compareRecordValues, deriveGender, formatRecordValue, GENDER_TITLE_LABELS } from '@lib/records-logic';
import {
  commonFieldsFrom,
  currentForGender,
  evidenceItems,
  evidenceProblems,
  firstFieldsFrom,
  kindForPath,
  newEntryId,
  parseClaimValue,
  recordDetailsFrom,
  snapshotAthletes,
  validateForSubmit,
} from '@lib/records-claims';
import { notifyClaimEvent } from '@lib/records-notifications';
import { createEvidenceUpload, ensureEvidenceFolder, evidenceFileName, syncEvidence, trashEvidenceFolder, uploadDescription } from '@lib/records-evidence';
import { evidenceFileProblem, MAX_EVIDENCE_ITEMS, MAX_SUBMISSIONS_PER_DAY, RECORDS_TEAM_EMAIL } from '@lib/records-rules';
import type { ClaimStatus, WorldRecordOrFirstTableItem } from '@lib/relational-types';
import type { ClaimActionResult, ClaimFormValues } from './claim/types';

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const revalidateClaimPages = () => {
  revalidatePath('/world_records/my-claims');
  revalidatePath('/admin/records-review');
};

/** The signed-in user's own claim, or null if it doesn't exist or belongs to someone else. */
async function getClaimOf(userId: string, kind: EntryKind, entryId: string): Promise<WorldRecordOrFirstTableItem | null> {
  const entry = await getEntry(kind, entryId);
  return entry && entry.claimantUserId === userId ? entry : null;
}

// ============================================================================
// LOOKUPS FOR THE FORM
// ============================================================================

export async function getClaimFormOptions() {
  await requireSession();
  const [recordCategories, firstCategories] = await Promise.all([getRecordCategories(), getFirstCategories()]);
  return {
    // Archived categories are not offered (FR-C4)
    recordCategories: recordCategories.filter(c => c.status !== 'archived'),
    firstCategories: firstCategories.filter(c => c.status !== 'archived'),
  };
}

/** The mark to beat on the list the chosen athletes go on (FR-5). */
export async function getMarkToBeat(categoryId: string, genders: ('MEN' | 'WOMEN')[]) {
  await requireSession();
  const category = await getRecordCategory(categoryId);
  if (!category || genders.length === 0) return null;
  const gender = deriveGender(genders.map(g => ({ gender: g })));
  const current = await currentForGender(category, gender);
  return {
    gender,
    genderLabel: GENDER_TITLE_LABELS[gender],
    value: current[0] ? formatRecordValue(category, current[0].value) : null,
    holders: current.flatMap(e => e.athletes.map(a => a.name)),
  };
}

/** Genders of picked SportHub users, so the form can show the list and mark to beat. */
export async function getAthleteGenders(userIds: string[]) {
  await requireSession();
  const profiles = await Promise.all(userIds.slice(0, 20).map(id => getUser(id)));
  return Object.fromEntries(profiles.filter(Boolean).map(p => [p!.userId, normalizeGender(p!.gender) ?? null]));
}

// ============================================================================
// SAVE, SUBMIT, WITHDRAW, DELETE
// ============================================================================

/**
 * Saves a draft, or submits (draft / changes requested → pending).
 * The claimant is the signed-in user; only they can edit their claim.
 */
export async function saveClaim(values: ClaimFormValues, intent: 'draft' | 'submit'): Promise<ClaimActionResult> {
  try {
    const session = await requireSession();
    const claimantId = session.user.id;
    const actor = actorOf(session);
    const kind = kindForPath(values.path);
    const submit = intent === 'submit';

    const existing = values.entryId ? await getEntry(kind, values.entryId) : null;
    if (existing && existing.claimantUserId !== claimantId) return { success: false, errors: ['You can only edit your own claims'] };
    if (existing && existing.status !== 'draft' && existing.status !== 'changes_requested') {
      return { success: false, errors: ['This claim can no longer be edited'] };
    }

    const [recordCategory, firstCategory] = await Promise.all([
      kind === 'record' && values.path === 'existing' && values.categoryId ? getRecordCategory(values.categoryId) : null,
      kind === 'first' && values.categoryId ? getFirstCategory(values.categoryId) : null,
    ]);

    // Athlete problems block drafts too, so an athlete is never silently left out of a saved claim
    const { athletes, errors } = await snapshotAthletes(values);
    errors.push(...evidenceProblems(values));
    if (submit) errors.push(...validateForSubmit(values, kind, recordCategory, firstCategory, athletes, claimantId));

    const entryId = existing?.entryId ?? newEntryId();
    const now = Date.now();
    const gender = athletes.length > 0 ? deriveGender(athletes) : 'MEN_ONLY';
    const base = {
      pk: '', sortKey: 'Metadata' as const, statusKey: '', dateSortKey: '',
      entryId,
      status: (submit ? 'pending' : existing?.status ?? 'draft') as ClaimStatus,
      gender,
      athletes,
      ...commonFieldsFrom(values),
      evidence: existing?.evidence ?? [],
      evidenceFolderId: existing?.evidenceFolderId,
      ethicsConfirmed: values.ethicsConfirmed,
      consentConfirmed: values.consentConfirmed,
      claimantUserId: claimantId,
      claimantName: actor.byName ?? claimantId,
      source: 'claim' as const,
      reviewComment: existing?.reviewComment,
      submittedAt: submit ? now : existing?.submittedAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    let entry: WorldRecordOrFirstTableItem;
    if (kind === 'first') {
      entry = {
        ...base,
        kind: 'first',
        categoryId: values.categoryId,
        categoryName: firstCategory?.name ?? '',
        ...firstFieldsFrom(values),
      };
    } else {
      const isNew = values.path === 'new_category';
      const { value, readable } = parseClaimValue(values, recordCategory);
      if (submit && values.valueText && !readable) errors.push(`Could not read the value "${values.valueText}"`);
      entry = {
        ...base,
        kind: 'record',
        categoryId: isNew ? `proposed-${entryId}` : values.categoryId,
        categoryName: isNew ? values.newCategory.name.trim() : recordCategory?.name ?? '',
        value,
        ...recordDetailsFrom(values),
        newCategoryProposal: isNew ? { ...values.newCategory, name: values.newCategory.name.trim() } : undefined,
      };

      // The value must beat or equal the current mark on its list (FR-5)
      if (submit && recordCategory && errors.length === 0) {
        const current = await currentForGender(recordCategory, gender);
        if (current[0] && compareRecordValues(recordCategory, value, current[0].value) < 0) {
          errors.push(`The current ${GENDER_TITLE_LABELS[gender].toLowerCase()} record is ${formatRecordValue(recordCategory, current[0].value)}. A claim has to beat or equal it.`);
        }
      }
    }

    if (errors.length > 0) return { success: false, errors };

    // Uploads, link shortcuts and the overview in the claim's Drive folder
    const synced = await syncEvidence(entry, evidenceItems(values));
    if (synced.errors.length > 0) return { success: false, errors: synced.errors };
    entry = { ...entry, evidence: synced.evidence, evidenceFolderId: synced.evidenceFolderId };

    // Every submission sends emails, so submissions per account per day are capped
    if (submit && !(await countSubmission(claimantId, MAX_SUBMISSIONS_PER_DAY))) {
      return {
        success: false,
        errors: [`You can submit at most ${MAX_SUBMISSIONS_PER_DAY} claims per day. Save it as a draft and submit it tomorrow, or write to ${RECORDS_TEAM_EMAIL}.`],
      };
    }

    await putEntry(entry, existing ? { expectedStatus: existing.status } : {});
    if (!existing) await putClaimantLink(claimantId, kind, entryId);
    if (submit) {
      // Athletes see a claim from submission on; athletes removed on resubmission lose it
      await syncAthleteLinks(kind, entryId, existing?.athletes ?? [], athletes);
      await addAuditEntry(kind, entryId, {
        action: existing?.status === 'changes_requested' ? 'resubmitted' : 'submitted',
        fromStatus: existing?.status ?? 'draft',
        toStatus: 'pending',
        ...actor,
      });
      await notifyClaimEvent('submitted', entry);
    } else if (!existing) {
      await addAuditEntry(kind, entryId, { action: 'created', toStatus: 'draft', ...actor });
    }

    revalidateClaimPages();
    return {
      success: true,
      entryId,
      kind,
      message: submit ? 'Your claim was sent to the ISA for review.' : 'Draft saved.',
    };
  } catch (error) {
    console.error('Error saving claim:', error);
    return { success: false, errors: [errorMessage(error, 'Failed to save the claim')] };
  }
}

/** Withdraw a pending claim back to draft (FR-8). */
export async function withdrawClaim(kind: EntryKind, entryId: string): Promise<ClaimActionResult> {
  try {
    const session = await requireSession();
    const entry = await getClaimOf(session.user.id, kind, entryId);
    if (!entry) return { success: false, errors: ['Claim not found'] };
    if (entry.status !== 'pending') return { success: false, errors: ['Only claims under review can be withdrawn'] };
    await putEntry({ ...entry, status: 'draft', updatedAt: Date.now() }, { expectedStatus: 'pending' });
    await addAuditEntry(kind, entryId, { action: 'withdrawn', fromStatus: 'pending', toStatus: 'draft', ...actorOf(session) });
    revalidateClaimPages();
    return { success: true, entryId, kind, message: 'Claim withdrawn. It is a draft again.' };
  } catch (error) {
    console.error('Error withdrawing claim:', error);
    return { success: false, errors: [errorMessage(error, 'Failed to withdraw')] };
  }
}

/** Delete a draft for good (FR-8). Only the claimant can, and only while it is a draft. */
export async function deleteDraft(kind: EntryKind, entryId: string): Promise<ClaimActionResult> {
  try {
    const session = await requireSession();
    const entry = await getClaimOf(session.user.id, kind, entryId);
    if (!entry) return { success: false, errors: ['Claim not found'] };
    if (entry.status !== 'draft') return { success: false, errors: ['Only drafts can be deleted'] };
    await deleteEntry(entry);
    // The folder goes to the Drive trash, where the ISA can still restore it
    await trashEvidenceFolder(entry.evidenceFolderId).catch(error => console.error('Error trashing evidence folder:', error));
    revalidateClaimPages();
    return { success: true, entryId, kind, message: 'Draft deleted.' };
  } catch (error) {
    console.error('Error deleting draft:', error);
    return { success: false, errors: [errorMessage(error, 'Failed to delete the draft')] };
  }
}

// ============================================================================
// EVIDENCE UPLOADS
// ============================================================================

export type EvidenceUploadResult =
  | { success: true; uploadUrl: string; fileName: string }
  | { success: false; errors: string[] };

/**
 * Starts an evidence upload: checks the file and that the user may add evidence
 * to this claim (its claimant while they can edit it, or a reviewer), then
 * returns an address the browser sends the file to. The file goes straight to
 * the claim's Drive folder, named after its description; it is attached to the
 * claim when the form is saved.
 */
export async function startEvidenceUpload(
  kind: EntryKind,
  entryId: string,
  file: { name: string; size: number; mimeType: string; description: string },
): Promise<EvidenceUploadResult> {
  try {
    const session = await requireSession();
    const entry = await getEntry(kind, entryId);
    if (!entry || entry.source !== 'claim') return { success: false, errors: ['Claim not found'] };
    const ownEditable = entry.claimantUserId === session.user.id && (entry.status === 'draft' || entry.status === 'changes_requested');
    if (!ownEditable && !hasRecordsPermission(session, 'records:review')) return { success: false, errors: ['You cannot add evidence to this claim'] };

    const description = file.description.trim();
    if (!description) return { success: false, errors: ['Describe the file before uploading it'] };
    const problem = evidenceFileProblem(file.name, file.size);
    if (problem) return { success: false, errors: [problem] };
    if (entry.evidence.length >= MAX_EVIDENCE_ITEMS) return { success: false, errors: [`A claim can have at most ${MAX_EVIDENCE_ITEMS} pieces of evidence`] };

    const folderId = await ensureEvidenceFolder(entry);
    if (folderId !== entry.evidenceFolderId) await putEntry({ ...entry, evidenceFolderId: folderId }, { expectedStatus: entry.status });

    const requestHeaders = await headers();
    const origin = requestHeaders.get('origin') ?? `${requestHeaders.get('x-forwarded-proto') ?? 'https'}://${requestHeaders.get('host')}`;
    const fileName = evidenceFileName(description, file.name);
    const uploadUrl = await createEvidenceUpload(folderId, {
      name: fileName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size,
      description: uploadDescription(description, file.name),
    }, origin);
    return { success: true, uploadUrl, fileName };
  } catch (error) {
    console.error('Error starting evidence upload:', error);
    return { success: false, errors: [errorMessage(error, 'The upload could not be started')] };
  }
}

// ============================================================================
// READS FOR THE CLAIMANT
// ============================================================================

/**
 * Claims the signed-in user made, or is an athlete on. Drafts are only shown to
 * the claimant (a withdrawn claim is a draft again).
 */
export async function getMyClaims(): Promise<WorldRecordOrFirstTableItem[]> {
  const session = await requireSession();
  const userId = session.user.id;
  return (await getUserClaims(userId)).filter(e =>
    e.claimantUserId === userId || (e.status !== 'draft' && e.athletes.some(a => a.userId === userId)));
}

/** A claim for the edit form; only the claimant can open it. */
export async function getOwnClaim(kind: EntryKind, entryId: string): Promise<WorldRecordOrFirstTableItem | null> {
  const session = await requireSession();
  return getClaimOf(session.user.id, kind, entryId);
}
