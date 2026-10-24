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
