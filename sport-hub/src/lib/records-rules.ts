/**
 * Texts from the ISA framework (October 2026 v2) shown on the claim form and to
 * reviewers: the criteria for world records and world firsts (FR-19, FR-20).
 */

export const RECORD_CRITERIA: { name: string; text: string }[] = [
  { name: 'Measurable', text: 'A single, quantitative, objective metric makes attempts comparable.' },
  { name: 'Standardisable', text: 'ISA definitions exist that every attempt must follow (e.g. what a send is).' },
  { name: 'Breakable', text: 'Anyone can in principle break it, and external constraints allow it.' },
  { name: 'Significant & separable', text: 'A significant increase on the previous mark; minor variations (sitting vs standing start, 60 m vs 65 m) are not separate records.' },
  { name: 'Challenged', text: 'Several people challenge and try to beat it beyond a challenging minimum standard.' },
  { name: 'Verifiable', text: 'Solid documentation verifies it.' },
  { name: 'Claimed', text: 'The athlete or people affiliated with the attempt claimed it.' },
];

export const FIRST_CRITERIA: { name: string; text: string }[] = [
  { name: 'Innovative, iconic, creative, unique', text: 'Something fundamentally new, not an incremental change to an existing trick.' },
  { name: 'Distinct from existing tricks', text: 'Not a minor variation; it has a clear identity and name.' },
  { name: 'Advanced skill', text: 'Not achievable by a beginner or intermediate athlete.' },
  { name: 'Significant leap forward', text: 'Pushes the boundaries of what is possible in slacklining.' },
  { name: 'Full control', text: 'Full control at initiation and termination of the trick.' },
];

export const ETHICS_STATEMENT =
  'I confirm this claim follows the ISA ethics guidelines for records (respect for nature and public spaces, safety, fair play, transparency) and the ISA Code of Conduct.';

export const MIN_WITNESSES = 2;

/** The ISA records team. Emails go to RECORDS_REVIEW_EMAIL when set (FR-30); this is the default and what the form shows. */
export const RECORDS_TEAM_EMAIL = 'records@slacklineinternational.org';

/**
 * Email rate limits. Every submission emails the athletes and each witness at
 * addresses the claimant typed in, so the number of submissions per account per
 * day, and the number of addresses per claim, are capped.
 */
export const MAX_SUBMISSIONS_PER_DAY = 5;
export const MAX_WITNESSES = 10;
export const MAX_ATHLETES = 10;

/** Witness rules for records and firsts alike: 2 to 10, each with a name and an email. */
export function witnessProblems(witnesses: { name: string; email: string }[]): string[] {
  const errors: string[] = [];
  if (witnesses.length < MIN_WITNESSES) errors.push(`Name at least ${MIN_WITNESSES} witnesses`);
  if (witnesses.length > MAX_WITNESSES) errors.push(`Name at most ${MAX_WITNESSES} witnesses`);
  if (witnesses.some(w => !w.name || !w.email)) errors.push('Each witness needs a name and an email');
  if (witnesses.some(w => w.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(w.email))) errors.push('Enter a valid email for each witness');
  return errors;
}

/** Evidence: links and uploaded files, each with a description. Files go to Google Drive. */
export const MAX_EVIDENCE_ITEMS = 20;
export const MAX_EVIDENCE_FILE_BYTES = 2 * 1024 ** 3;
export const MAX_EVIDENCE_FILE_LABEL = '2 GB';
/** Photos, videos, tracks (GPX, KML, FIT, TCX), PDFs and spreadsheets/text with measurements. */
export const EVIDENCE_FILE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif', 'tif', 'tiff',
  'mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm', 'mts', '3gp',
  'gpx', 'kml', 'kmz', 'fit', 'tcx',
  'pdf', 'csv', 'txt', 'xlsx', 'ods',
];
export const EVIDENCE_FILE_ACCEPT = EVIDENCE_FILE_EXTENSIONS.map(e => `.${e}`).join(',');

export const evidenceFileProblem = (name: string, size: number): string | null => {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (!name.includes('.') || !EVIDENCE_FILE_EXTENSIONS.includes(extension)) {
    return `"${name}": this file type can't be uploaded. Allowed: photos, videos, GPX/KML/FIT/TCX tracks, PDF, CSV, TXT and spreadsheets.`;
  }
  if (size <= 0) return `"${name}" is empty`;
  if (size > MAX_EVIDENCE_FILE_BYTES) return `"${name}" is larger than ${MAX_EVIDENCE_FILE_LABEL}`;
  return null;
};

export const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

/**
 * Reasons a reviewer picks when rejecting a claim, one list per kind of claim
 * (approved by Jonas 2026-11-02). "other" needs a free-text comment; with a
 * predefined reason the comment is optional.
 */
export type RejectionCase = 'category' | 'record' | 'first';

export const REJECTION_REASONS: Record<RejectionCase, { code: string; label: string }[]> = {
  category: [
    { code: 'not_separable', label: 'Not clearly separable from an existing category (a minor variation)' },
    { code: 'not_measurable', label: 'Cannot be measured objectively (no single quantitative metric)' },
    { code: 'not_standardisable', label: 'Cannot be standardised (no clear definition every attempt can follow)' },
    { code: 'not_breakable', label: 'Not breakable by others (it depends on unique conditions)' },
    { code: 'out_of_scope', label: 'Out of scope (for example free solo, a crossing instead of a send, or a material-specific category)' },
  ],
  record: [
    { code: 'insufficient_evidence', label: 'Insufficient documentation or proof (video, measurement)' },
    { code: 'below_record', label: 'Below the current record (an equal value is shared, not rejected)' },
    { code: 'invalid_attempt', label: 'Not a valid attempt under the category rules (for example a fall, or a wrong measurement method)' },
    { code: 'witnesses', label: 'Witness requirements not met, or the witnesses could not confirm the attempt' },
    { code: 'ethics', label: 'Breach of the ethics guidelines or the Code of Conduct' },
  ],
  first: [
    { code: 'insufficient_novelty', label: 'Insufficient novelty (a minor variation of an existing trick)' },
    { code: 'already_landed', label: 'Already landed earlier by someone else' },
    { code: 'insufficient_control', label: 'Insufficient control at the start or end of the trick' },
    { code: 'skill_level', label: 'Not an advanced enough skill level' },
    { code: 'insufficient_evidence', label: 'Insufficient documentation (the landing isn\'t clearly shown or confirmed)' },
  ],
};

export const OTHER_REJECTION_REASON = 'other';

/** What the reviewer picked when rejecting: a reason code, the text for "other", and an optional comment. */
export interface RejectionInput {
  reason: string;
  otherReason?: string;
  comment?: string;
}

/**
 * The text the claimant sees for a rejection: the reason (its label, or the
 * reviewer's own words for "other"), followed by the optional comment. Returns
 * an error when the reason is unknown, or "other" comes without a description.
 */
export function rejectionText(rejectionCase: RejectionCase, input: RejectionInput): { text: string } | { error: string } {
  const note = input.comment?.trim() ?? '';
  let reason: string | undefined;
  if (input.reason === OTHER_REJECTION_REASON) {
    reason = input.otherReason?.trim().replace(/[.\s]+$/, '');
    if (!reason) return { error: 'Describe the reason' };
  } else {
    reason = REJECTION_REASONS[rejectionCase].find(r => r.code === input.reason)?.label;
    if (!reason) return { error: 'Choose a reason' };
  }
  return { text: note ? `${reason}. ${note}` : reason };
}

/** A record claim whose proposed category hasn't been created or mapped yet. */
export const isNewCategoryClaim = (entry: { kind: string; categoryId: string; newCategoryProposal?: unknown }) =>
  entry.kind === 'record' && !!entry.newCategoryProposal && entry.categoryId.startsWith('proposed-');

/** Which reason list applies to a claim. */
export const rejectionCaseOf = (entry: { kind: string; categoryId: string; newCategoryProposal?: unknown }): RejectionCase =>
  entry.kind === 'first' ? 'first' : isNewCategoryClaim(entry) ? 'category' : 'record';
