import type { PendingUserData } from 'src/app/events/submit/types';
import type { RecordWitness, WorldRecordOrFirstTableItem } from '@lib/relational-types';

/** The three paths of the claim form (FR-4). */
export type ClaimPath = 'existing' | 'new_category' | 'first';

export interface ClaimAthleteValue {
  userId?: string;
  name: string;
  pendingUser?: PendingUserData;   // New athlete, created on approval (FR-9)
}

/** One piece of evidence on the form: a link, or a file already uploaded to the claim's folder. */
export interface ClaimEvidenceValue {
  type: 'link' | 'file';
  url: string;                     // Links only
  description: string;
  driveFileId?: string;
  fileName?: string;
  originalFileName?: string;
  mimeType?: string;
  size?: number;
}

export const emptyEvidenceLink = (): ClaimEvidenceValue => ({ type: 'link', url: '', description: '' });

export interface ClaimFormValues {
  entryId?: string;
  path: ClaimPath;
  categoryId: string;              // Record category (path a) or first category (path c)
  newCategory: {
    name: string;
    measurement: string;
    unit: string;
    direction: 'higher' | 'lower';
    justification: string;
  };
  athletes: ClaimAthleteValue[];
  jointConfirmed: boolean;         // More than one athlete = one joint performance (FR-9f)
  consentConfirmed: boolean;       // Claiming for others (FR-9e)

  // Records
  valueText: string;               // Parsed with the category's unit, or coordinates
  date: string;                    // yyyy-mm-dd
  locationName: string;
  locationCountry: string;
  setup: string;
  furtherSpecs: string;
  witnesses: RecordWitness[];
  fullVideo: boolean;
  noFullVideoReason: string;

  // Firsts
  trickName: string;
  description: string;
  whyFirst: string;
  similarTricks: string;
  lineDetails: string;

  // Both
  eventId: string;
  evidence: ClaimEvidenceValue[];
  ethicsConfirmed: boolean;
}

export const emptyClaim = (path: ClaimPath = 'existing'): ClaimFormValues => ({
  path,
  categoryId: '',
  newCategory: { name: '', measurement: '', unit: 'm', direction: 'higher', justification: '' },
  athletes: [{ name: '' }],
  jointConfirmed: false,
  consentConfirmed: false,
  valueText: '',
  date: '',
  locationName: '',
  locationCountry: '',
  setup: '',
  furtherSpecs: '',
  witnesses: [{ name: '', email: '', phone: '' }, { name: '', email: '', phone: '' }],
  fullVideo: true,
  noFullVideoReason: '',
  trickName: '',
  description: '',
  whyFirst: '',
  similarTricks: '',
  lineDetails: '',
  eventId: '',
  evidence: [emptyEvidenceLink()],
  ethicsConfirmed: false,
});

export type ClaimActionResult =
  | { success: true; entryId: string; kind: 'record' | 'first'; message?: string }
  | { success: false; errors: string[] };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Witness fields for the form; older claims had one "email or phone" contact. */
const witnessFields = (w: RecordWitness): RecordWitness => {
  const legacy = w.contact?.trim() ?? '';
  return {
    name: w.name,
    email: w.email ?? (EMAIL.test(legacy) ? legacy : ''),
    phone: w.phone ?? (legacy && !EMAIL.test(legacy) ? legacy : ''),
  };
};

/** Loads a saved claim back into the form (edit a draft or a claim with changes requested). */
export function entryToClaimValues(entry: WorldRecordOrFirstTableItem): ClaimFormValues {
  const proposal = entry.kind === 'record' ? entry.newCategoryProposal : undefined;
  const base = emptyClaim(entry.kind === 'first' ? 'first' : proposal ? 'new_category' : 'existing');
  const common: ClaimFormValues = {
    ...base,
    entryId: entry.entryId,
    categoryId: proposal ? '' : entry.categoryId,
    athletes: entry.athletes.length > 0
      ? entry.athletes.map(a => ({ userId: a.userId, name: a.name, pendingUser: a.pendingUser }))
      : base.athletes,
    jointConfirmed: entry.athletes.length > 1,
    consentConfirmed: entry.consentConfirmed ?? false,
    date: entry.date,
    locationName: entry.locationName ?? '',
    locationCountry: entry.locationCountry ?? '',
    eventId: entry.eventId ?? '',
    evidence: entry.evidence.length > 0
      ? entry.evidence.map(e => ({
        type: e.type,
        url: e.type === 'link' ? e.url : '',
        description: e.description ?? e.label ?? '',
        driveFileId: e.driveFileId,
        fileName: e.fileName,
        originalFileName: e.originalFileName,
        mimeType: e.mimeType,
        size: e.size,
      }))
      : [emptyEvidenceLink()],
    ethicsConfirmed: entry.ethicsConfirmed ?? false,
  };
  if (entry.kind === 'first') {
    return {
      ...common,
      trickName: entry.trickName,
      description: entry.description ?? '',
      whyFirst: entry.whyFirst ?? '',
      similarTricks: entry.similarTricks ?? '',
      lineDetails: entry.lineDetails ?? '',
    };
  }
  const witnesses = entry.witnesses.map(witnessFields);
  while (witnesses.length < 2) witnesses.push({ name: '', email: '', phone: '' });
  return {
    ...common,
    newCategory: entry.newCategoryProposal ? { ...entry.newCategoryProposal } : base.newCategory,
    valueText: entry.value.original ?? '',
    setup: entry.setup ?? '',
    furtherSpecs: entry.furtherSpecs ?? '',
    witnesses,
    fullVideo: !entry.noFullVideoReason,
    noFullVideoReason: entry.noFullVideoReason ?? '',
  };
}
