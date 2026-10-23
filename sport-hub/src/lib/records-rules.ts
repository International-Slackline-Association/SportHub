/**
 * Texts from the ISA framework (October 2026 v2) shown on the claim form and to
 * reviewers: rule checklists per category (requirements §7.4) and the criteria
 * for world records and world firsts (FR-19, FR-20).
 */

import type { RecordRuleSet } from './relational-types';

export const RULE_CHECKLISTS: Record<RecordRuleSet, { title: string; items: string[] }> = {
  highline_send: {
    title: 'Highline send',
    items: [
      'The entire length of the line was walked (except the no-fall zones), in one direction, continuously, without falling, sitting, or touching the line with anything but the feet.',
      'No-fall zones at the start and end were only as long as needed for safety (unnecessarily long no-fall zones can void the attempt).',
      'Controlled finish: the walk ended by sitting down or with a controlled catch. No leash fall, not even a deliberate one.',
    ],
  },
  longline_send: {
    title: 'Longline send',
    items: [
      'The line was walked from end to end (weblock to sewn loop), continuously, without falling, sitting, or touching the line with anything but the feet.',
      'Controlled finish: the walk ended by sitting down or with a controlled catch.',
    ],
  },
  waterline: {
    title: 'Waterline',
    items: [
      'At least 80 % of the line’s length is over a body of water.',
      'The line was not rigged unnecessarily high: a leash fall in the middle of the line would potentially touch the water.',
      'The athlete was leashed and the line had a backup.',
    ],
  },
  urban_highline: {
    title: 'Urban highline',
    items: ['At least 80 % of the line’s length is over urban landscape.'],
  },
  speedline: {
    title: 'Highline run (speedline)',
    items: [
      'The distance was marked on the line with tape. At the start the athlete’s full body was behind the starting tape; the time stopped when the athlete touched the finish tape.',
      'The line length matches the running distance (e.g. a 100 m run on a 1 km line does not count).',
    ],
  },
  measurements: {
    title: 'Measurements',
    items: [
      'Line length is the straight anchor-to-anchor distance, without adding sag and without subtracting the no-fall zones.',
      'Line height is measured from the lower of the two anchors to the lowest point of ground or water below the straight line between the anchors.',
    ],
  },
};

/** Checklist item ids are "{ruleSet}:{index}" so a confirmation can be stored and checked. */
export const ruleItemIds = (ruleSets: RecordRuleSet[]): string[] =>
  ruleSets.flatMap(rs => RULE_CHECKLISTS[rs].items.map((_, i) => `${rs}:${i}`));

export const FIRST_GENERAL_RULES = [
  'A single trick, not a combo.',
  'The athlete was in full control at initiation and termination of the trick.',
];

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
