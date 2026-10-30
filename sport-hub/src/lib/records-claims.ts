/**
 * Server-side helpers shared by the claimant actions (src/app/world_records/actions.ts)
 * and the reviewer actions (src/app/admin/records-review/actions.ts): reading the
 * claim form into entry fields, validating a submission, snapshotting athletes and
 * creating profiles for new athletes.
 *
 * No permission checks here; the server actions do those before calling in.
 */

import { getUser } from './user-service';
import { normalizeGender } from '@utils/gender';
import { createUser } from '@ui/UserForm/actions';
import { getEntriesByCategory, type EntryKind } from './records-service';
import { comparableValue, parseRecordValue, splitCurrentAndHistory } from './records-logic';
import { MAX_ATHLETES, MAX_EVIDENCE_ITEMS, witnessProblems } from './records-rules';
import type { EvidenceItemInput } from './records-evidence';
import type {
  WorldRecordOrFirstEntryAthlete,
  FirstCategoryTableItem,
  WorldFirstTableItem,
  RecordCategoryTableItem,
  WorldRecordTableItem,
  RecordValue,
  RecordWitness,
  WorldRecordOrFirstTableItem,
} from './relational-types';
import type { ClaimFormValues } from 'src/app/world_records/claim/types';
import { INVALID_URL_MESSAGE, isValidUrl, normalizeUrl } from '@utils/urls';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const kindForPath = (path: ClaimFormValues['path']): EntryKind => (path === 'first' ? 'first' : 'record');

export const newEntryId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Evidence the claimant filled in: links with an address and uploaded files. Empty link rows are dropped. */
export const evidenceItems = (values: ClaimFormValues): EvidenceItemInput[] =>
  values.evidence
    .filter(e => (e.type === 'link' ? !!e.url.trim() : !!e.driveFileId))
    .map(e => ({
      type: e.type,
      url: e.type === 'link' ? normalizeUrl(e.url) : '',
      description: e.description,
      driveFileId: e.driveFileId,
      fileName: e.fileName,
      originalFileName: e.originalFileName,
    }));

/** Checks every evidence item; drafts too, since links are written to the evidence folder on save. */
export function evidenceProblems(values: ClaimFormValues): string[] {
  const errors: string[] = [];
  const items = evidenceItems(values);
  if (items.length > MAX_EVIDENCE_ITEMS) errors.push(`A claim can have at most ${MAX_EVIDENCE_ITEMS} pieces of evidence`);
  for (const item of items) if (item.type === 'link' && !isValidUrl(item.url)) errors.push(`"${item.url}": ${INVALID_URL_MESSAGE}`);
  return errors;
}

const isFilled = (w: RecordWitness) => !!(w.name.trim() || w.email.trim() || w.phone?.trim());

/** Witness rows the claimant filled in, trimmed. Empty rows of the form are dropped. */
export const toWitnesses = (values: ClaimFormValues): RecordWitness[] =>
  values.witnesses
    .filter(isFilled)
    .map(w => ({ name: w.name.trim(), email: w.email.trim(), phone: w.phone?.trim() || undefined }));

// ============================================================================
// FORM → ENTRY FIELDS
// ============================================================================

/** Fields both kinds of entry take straight from the form. */
export const commonFieldsFrom = (values: ClaimFormValues) => ({
  date: values.date,
  locationName: values.locationName.trim() || undefined,
  locationCountry: values.locationCountry || undefined,
  eventId: values.eventId || undefined,
  witnesses: toWitnesses(values),
});

/** First-specific fields (§8.2). */
export const firstFieldsFrom = (values: ClaimFormValues): Pick<WorldFirstTableItem, 'trickName' | 'description' | 'whyFirst' | 'similarTricks' | 'lineDetails'> => ({
  trickName: values.trickName.trim(),
  description: values.description.trim() || undefined,
  whyFirst: values.whyFirst.trim() || undefined,
  similarTricks: values.similarTricks.trim() || undefined,
  lineDetails: values.lineDetails.trim() || undefined,
});

/** Record-specific fields (§8.1) apart from category and value. */
export const recordDetailsFrom = (values: ClaimFormValues): Pick<WorldRecordTableItem, 'setup' | 'furtherSpecs' | 'noFullVideoReason'> => ({
  setup: values.setup.trim() || undefined,
  furtherSpecs: values.furtherSpecs.trim() || undefined,
  noFullVideoReason: values.fullVideo ? undefined : values.noFullVideoReason.trim() || undefined,
});

/**
 * Reads the value with the unit of the chosen category, or of the proposed
 * category for a new-category claim. `readable` is false when no comparable
 * number or coordinate could be read.
 */
export function parseClaimValue(
  values: ClaimFormValues,
  recordCategory: RecordCategoryTableItem | null,
): { value: RecordValue; readable: boolean } {
  const unit = values.path === 'new_category' ? values.newCategory.unit : recordCategory?.unit ?? 'm';
  const value = parseRecordValue({ unit, group: recordCategory?.group }, values.valueText);
  return { value, readable: comparableValue({ direction: 'higher', unit }, value) !== undefined };
}

// ============================================================================
// ATHLETES
// ============================================================================

/**
 * Gender and country come from the athlete's profile, copied onto the claim at
 * submission (FR-9a). New athletes bring them on the claim (FR-9). Only male or
 * female is accepted for now (FR-9d). Athletes that can't be resolved are left
 * out of `athletes` and explained in `errors`.
 *
 * `existing` are the athletes already on the entry (admin Modify): imported
 * athletes without a SportHub profile are kept by name (FR-36), so an admin can
 * edit such an entry without linking them first.
 */
export async function snapshotAthletes(
  values: ClaimFormValues,
  existing: WorldRecordOrFirstEntryAthlete[] = [],
): Promise<{ athletes: WorldRecordOrFirstEntryAthlete[]; errors: string[] }> {
  const errors: string[] = [];
  const athletes: WorldRecordOrFirstEntryAthlete[] = [];
  const nameOnly = existing.filter(a => !a.userId && !a.pendingUser);
  for (const athlete of values.athletes) {
    if (athlete.userId) {
      const profile = await getUser(athlete.userId);
      if (!profile) { errors.push(`Athlete ${athlete.name || athlete.userId} was not found`); continue; }
      const name = [profile.name, profile.surname].filter(Boolean).join(' ') || athlete.name;
      const gender = normalizeGender(profile.gender);
      if (gender !== 'MEN' && gender !== 'WOMEN') {
        errors.push(`${name} has no male or female gender on their profile. They need to set it first.`);
        continue;
      }
      athletes.push({ userId: profile.userId, name, gender, country: profile.country });
    } else if (athlete.pendingUser) {
      const p = athlete.pendingUser;
      const name = [p.name, p.surname].filter(Boolean).join(' ');
      const gender = normalizeGender(p.gender);
      if (!p.name || !p.surname || !p.email) { errors.push('New athletes need a name, surname and email'); continue; }
      if (!EMAIL.test(p.email.trim())) { errors.push(`Enter a valid email for ${name}`); continue; }
      if (gender !== 'MEN' && gender !== 'WOMEN') { errors.push(`Choose male or female for ${name}`); continue; }
      athletes.push({ name, gender, country: p.country, pendingUser: p });
    } else if (athlete.name) {
      const kept = nameOnly.findIndex(a => a.name === athlete.name);
      if (kept >= 0) { athletes.push(nameOnly.splice(kept, 1)[0]); continue; }
      errors.push(`Pick "${athlete.name}" from the SportHub users or add them as a new athlete`);
    }
  }
  return { athletes, errors };
}

/** Creates SportHub profiles for new athletes on an entry and returns the athletes with their user ids (FR-9). */
export async function createPendingAthletes(entry: WorldRecordOrFirstTableItem): Promise<WorldRecordOrFirstEntryAthlete[]> {
  const athletes: WorldRecordOrFirstEntryAthlete[] = [];
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

// ============================================================================
// VALIDATION AND CURRENT MARKS
// ============================================================================

/** Current mark on one list of a category: the best published value, ties are co-holders. */
export async function currentForGender(category: RecordCategoryTableItem, list: ContestGender): Promise<WorldRecordTableItem[]> {
  const entries = (await getEntriesByCategory('record', category.categoryId))
    .filter(e => e.status === 'published' && e.gender === list);
  return splitCurrentAndHistory(category, entries).current;
}

/** Everything a claim needs before it can be submitted (§7.2, §7.3, §8). The value check is separate. */
export function validateForSubmit(
  values: ClaimFormValues,
  kind: EntryKind,
  recordCategory: RecordCategoryTableItem | null,
  firstCategory: FirstCategoryTableItem | null,
  athletes: WorldRecordOrFirstEntryAthlete[],
  claimantId: string,
): string[] {
  const errors: string[] = [];
  const required = (value: string, label: string) => { if (!value?.trim()) errors.push(`${label} is required`); };

  if (athletes.length === 0) errors.push('Add at least one athlete');
  if (athletes.length > MAX_ATHLETES) errors.push(`A claim can have at most ${MAX_ATHLETES} athletes`);
  if (athletes.length > 1 && !values.jointConfirmed) {
    errors.push('Confirm that the athletes did this as one joint performance. Co-holders who did it separately submit their own claims.');
  }
  const claimantIsOnlyAthlete = athletes.length === 1 && athletes[0].userId === claimantId;
  if (!claimantIsOnlyAthlete && !values.consentConfirmed) {
    errors.push('Confirm that you have the consent of every athlete on this claim');
  }

  const items = evidenceItems(values);
  if (items.length === 0 && (kind === 'first' || values.fullVideo)) {
    errors.push(kind === 'first' ? 'Add at least one video showing the trick being landed, as a link or a file' : 'Add the video of the attempt, as a link or a file');
  }
  if (items.some(i => !i.description.trim())) errors.push('Add a description to every piece of evidence');

  required(values.date, 'Date');
  if (values.date && values.date > new Date().toISOString().slice(0, 10)) errors.push('The date cannot be in the future');
  if (!values.ethicsConfirmed) errors.push('Confirm the ISA ethics guidelines and Code of Conduct');

  errors.push(...witnessProblems(toWitnesses(values)));

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
    if (values.newCategory.direction !== 'higher' && values.newCategory.direction !== 'lower') errors.push('Choose whether higher or lower is better');
  }
  required(values.valueText, 'Record value');
  required(values.locationName, 'Location');
  required(values.locationCountry, 'Country of the location');
  if (!values.fullVideo && !values.noFullVideoReason.trim()) errors.push('Explain why there is no full video');

  return errors;
}
