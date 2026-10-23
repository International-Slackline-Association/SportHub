/**
 * Initial record and world-first categories.
 *
 * Seeded from the ISA framework April 2025 v1 list (the October 2026 v2 framework
 * no longer lists categories). Material-specific and discontinued categories are
 * loaded as archived; the "Rankings" categories are not loaded.
 */

import type {
  FirstCategoryRecord,
  RecordCategoryRecord,
  RecordRuleSet,
  RecordUnit,
} from './relational-types';

type RecordCategorySeed = Pick<
  RecordCategoryRecord,
  'categoryId' | 'name' | 'group' | 'lineType' | 'direction' | 'valueType' | 'unit' | 'leashed' | 'ruleSets' | 'status' | 'joint'
>;

const HL: RecordRuleSet[] = ['highline_send', 'measurements'];
const LL: RecordRuleSet[] = ['longline_send', 'measurements'];
const WL: RecordRuleSet[] = ['highline_send', 'waterline', 'measurements'];
const SPEED: RecordRuleSet[] = ['speedline'];

const length = (
  categoryId: string,
  name: string,
  group: string,
  lineType: string,
  ruleSets: RecordRuleSet[],
  extra: Partial<RecordCategorySeed> = {},
): RecordCategorySeed => ({
  categoryId, name, group, lineType, ruleSets,
  direction: 'higher', valueType: 'number', unit: 'm', leashed: lineType !== 'Longline', status: 'active',
  ...extra,
});

const measure = (
  categoryId: string,
  name: string,
  group: string,
  lineType: string,
  unit: RecordUnit,
  extra: Partial<RecordCategorySeed> = {},
): RecordCategorySeed => ({
  categoryId, name, group, lineType, unit,
  direction: 'higher', valueType: 'number', leashed: true, ruleSets: [], status: 'active',
  ...extra,
});

const speed = (categoryId: string, name: string, group: string, leashed: boolean): RecordCategorySeed => ({
  categoryId, name, group, lineType: 'Highline', unit: 's',
  direction: 'lower', valueType: 'number', leashed, ruleSets: SPEED, status: 'active',
});

export const RECORD_CATEGORY_SEEDS: RecordCategorySeed[] = [
  // Longline length over ground (unleashed)
  length('longline-length', 'Longline length over ground', 'Longline length', 'Longline', LL),
  length('longline-length-polyester', 'Longline length over ground – Polyester', 'Longline length', 'Longline', LL, { status: 'archived' }),
  length('longline-length-polyamide', 'Longline length over ground – Polyamide', 'Longline length', 'Longline', LL, { status: 'archived' }),
  length('longline-length-humanline', 'Longline length – Humanline', 'Longline length', 'Longline', LL),
  length('longline-length-jumping', 'Longline length – Jumping (lemur leap / one foot)', 'Longline length', 'Longline', LL),

  // Water-midlines length (leashed)
  length('waterline-length', 'Waterline length', 'Waterline length', 'Waterline', WL),
  length('waterline-length-polyester', 'Waterline length – Polyester', 'Waterline length', 'Waterline', WL, { status: 'archived' }),
  length('waterline-length-polyamide', 'Waterline length – Polyamide', 'Waterline length', 'Waterline', WL, { status: 'archived' }),
  length('waterline-length-unleashed', 'Mid-waterline length – unleashed, single line', 'Waterline length', 'Waterline', ['longline_send', 'waterline', 'measurements'], { status: 'archived', leashed: false }),

  // Highline length (leashed)
  length('highline-length', 'Highline length', 'Highline length', 'Highline', HL),
  length('highline-length-polyester', 'Highline length – Polyester', 'Highline length', 'Highline', HL, { status: 'archived' }),
  length('highline-length-polyamide', 'Highline length – Polyamide', 'Highline length', 'Highline', HL, { status: 'archived' }),
  length('highline-length-urban', 'Highline length – Urban', 'Highline length', 'Highline', ['highline_send', 'urban_highline', 'measurements']),
  length('highline-length-unicycle', 'Highline length – Unicycle', 'Highline length', 'Highline', HL),
  length('highline-length-tandem', 'Highline length – Tandem (two people holding hands)', 'Highline length', 'Highline', HL, { joint: true }),
  length('highline-length-blind', 'Highline length – Blindfolded', 'Highline length', 'Highline', HL),
  length('highline-length-humanline', 'Highline length – Humanline', 'Highline length', 'Highline', HL),
  length('highline-length-underground', 'Highline length – Underground (cave)', 'Highline length', 'Highline', HL),
  length('highline-length-cable-cars', 'Highline length – Between cable cars', 'Highline length', 'Highline', HL),

  // Highline height / depth (leashed)
  length('highline-height', 'Highline height above ground / water', 'Highline height', 'Highline', HL),
  length('highline-height-urban', 'Highline height – Urban, above ground / water', 'Highline height', 'Highline', ['highline_send', 'urban_highline', 'measurements']),
  length('highline-height-altitude', 'Highline height above sea level', 'Highline height', 'Highline', HL),
  length('highline-depth-underground', 'Highline depth below ground (underground)', 'Highline height', 'Highline', HL),

  // Speed highlines (leashed): time for the distance
  speed('speed-highline-60m', 'Speed highline – 60 m', 'Speed highline', true),
  speed('speed-highline-100m', 'Speed highline – 100 m', 'Speed highline', true),
  speed('speed-highline-200m', 'Speed highline – 200 m', 'Speed highline', true),
  speed('speed-highline-300m', 'Speed highline – 300 m', 'Speed highline', true),
  speed('speed-highline-400m', 'Speed highline – 400 m', 'Speed highline', true),
  speed('speed-highline-100m-blind', 'Speed highline – 100 m blindfolded', 'Speed highline', true),

  // Speedlines over ground (unleashed)
  { ...speed('speedline-14-5m', 'Speedline over ground – 14.5 m', 'Speedline over ground', false), lineType: 'Longline' },
  { ...speed('speedline-29m', 'Speedline over ground – 29 m', 'Speedline over ground', false), lineType: 'Longline' },

  // Endurance
  measure('endurance-slackline-1h', 'Slackline distance in 1 hour', 'Endurance', 'Slackline', 'm'),
  measure('endurance-highline-24h', 'Highline distance in 24 hours (with pauses)', 'Endurance', 'Highline', 'm'),
  measure('endurance-slackline-24h', 'Slackline distance in 24 hours (with pauses)', 'Endurance', 'Slackline', 'm'),
  measure('endurance-highline-72h', 'Highline distance in 3 days (72 hours)', 'Endurance', 'Highline', 'm'),
  measure('endurance-highline-blind', 'Highline distance blindfolded without falling', 'Endurance', 'Highline', 'm'),
  measure('endurance-slackline-31d', 'Slackline distance in one month (31 days)', 'Endurance', 'Slackline', 'm'),
  measure('endurance-standing-walking', 'Longest duration standing / walking on a slackline', 'Endurance', 'Slackline', 's'),
  measure('endurance-surfing', 'Longest duration surfing on a rodeo- / slackline', 'Endurance', 'Rodeoline', 's'),
  measure('endurance-living-highline', 'Longest duration living on a highline', 'Endurance', 'Highline', 's'),

  // Trick records
  measure('trick-high-jump', 'High jump over pole (feet to feet) on a trickline', 'Trick', 'Trickline', 'm'),
  measure('trick-front-flips', 'Most front flips feet to feet in a row on a trickline', 'Trick', 'Trickline', 'count'),
  measure('trick-handstand-slackline', 'Longest duration handstand on a slackline over ground', 'Trick', 'Slackline', 's'),
  measure('trick-handstand-highline', 'Longest duration handstand on a highline', 'Trick', 'Highline', 's'),
  measure('trick-juggling-3-clubs', 'Longest distance walk juggling three clubs', 'Trick', 'Slackline', 'm'),
  measure('trick-juggling-5-clubs', 'Longest distance walk juggling five clubs', 'Trick', 'Slackline', 'm'),
  measure('trick-juggling-duration', 'Longest duration juggling on a slackline', 'Trick', 'Slackline', 's'),
  measure('trick-football', 'Longest duration controlling a football on an elevated slackline', 'Trick', 'Highline', 's'),
  measure('trick-skips', 'Most consecutive skips on a slackline', 'Trick', 'Trickline', 'count'),
  measure('trick-elbow-lever', 'Longest duration one arm elbow lever on a slackline', 'Trick', 'Slackline', 's'),
  measure('trick-davinci-spins', 'Most spins on four slacklines (Da Vinci slackline) in one minute', 'Trick', 'Da-Vinci Line', 'count'),

  // Rigging
  measure('rigging-solo-rig-derig', 'Longest line solo-rig and derig', 'Rigging', 'Highline', 'm'),
  measure('rigging-solo-most-lines-24h', 'Most different lines solo-rigged, derigged and sent in 24 hours', 'Rigging', 'Highline', 'count'),
  measure('rigging-group-most-lines-24h', 'Most lines rigged and sent in 24 hours (in a group)', 'Rigging', 'Highline', 'count', { joint: true }),
  {
    ...measure('rigging-northern-southern', 'Geographically most northern / southern highline rig', 'Rigging', 'Highline', 'm'),
    valueType: 'coordinates',
  },
];

type FirstCategorySeed = Pick<FirstCategoryRecord, 'categoryId' | 'name' | 'terminationRule' | 'status'>;

export const FIRST_CATEGORY_SEEDS: FirstCategorySeed[] = [
  {
    categoryId: 'trickline',
    name: 'Trickline',
    status: 'active',
    terminationRule: 'The athlete keeps the final position until reaching nearly static control, with no saving by going to another position (e.g. chest or butt).',
  },
  {
    categoryId: 'highline-freestyle',
    name: 'Highline Freestyle',
    status: 'active',
    terminationRule: 'The athlete keeps the final position for a total of 3 bounces, with no "saving tricks" (e.g. Yoda, Rocket).',
  },
  { categoryId: 'rodeoline', name: 'Rodeoline', status: 'active' },
  { categoryId: 'static', name: 'Static', status: 'active' },
];

export const buildRecordCategoryRecords = (now = Date.now()): RecordCategoryRecord[] =>
  RECORD_CATEGORY_SEEDS.map((seed, order) => ({
    pk: 'RecordCategory',
    sortKey: `RecordCategory:${seed.categoryId}`,
    ...seed,
    order,
    createdAt: now,
    updatedAt: now,
  }));

export const buildFirstCategoryRecords = (now = Date.now()): FirstCategoryRecord[] =>
  FIRST_CATEGORY_SEEDS.map((seed, order) => ({
    pk: 'FirstCategory',
    sortKey: `FirstCategory:${seed.categoryId}`,
    ...seed,
    order,
    createdAt: now,
    updatedAt: now,
  }));
