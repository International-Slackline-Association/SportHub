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
