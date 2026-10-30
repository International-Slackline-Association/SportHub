/**
 * Initial record and world-first categories.
 *
 * Seeded from the ISA framework April 2025 v1 list (the October 2026 v2 framework
 * no longer lists categories). Material-specific and discontinued categories are
 * loaded as archived; the "Rankings" categories are not loaded.
 */

import type {
  FirstCategoryTableItem,
  RecordCategoryGroup,
  RecordCategoryTableItem,
  RecordCategoryStatus,
} from './relational-types';

type RecordCategorySeed = Pick<RecordCategoryTableItem, 'categoryId' | 'name' | 'group' | 'unit' | 'direction' | 'status'>;

const seed = (
  categoryId: string,
  name: string,
  group: RecordCategoryGroup,
  unit: string,
  direction: 'higher' | 'lower',
  status: RecordCategoryStatus = 'active',
): RecordCategorySeed => ({ categoryId, name, group, unit, direction, status });

export const RECORD_CATEGORY_SEEDS: RecordCategorySeed[] = [
  // Longline length over ground
  seed('longline-length', 'Longline length over ground', 'Length', 'm', 'higher'),
  seed('longline-length-polyester', 'Longline length over ground – Polyester', 'Length', 'm', 'higher', 'archived'),
  seed('longline-length-polyamide', 'Longline length over ground – Polyamide', 'Length', 'm', 'higher', 'archived'),
  seed('longline-length-humanline', 'Longline length – Humanline', 'Length', 'm', 'higher'),
  seed('longline-length-jumping', 'Longline length – Jumping (lemur leap / one foot)', 'Length', 'm', 'higher'),

  // Waterline length
  seed('waterline-length', 'Waterline length', 'Length', 'm', 'higher'),
  seed('waterline-length-polyester', 'Waterline length – Polyester', 'Length', 'm', 'higher', 'archived'),
  seed('waterline-length-polyamide', 'Waterline length – Polyamide', 'Length', 'm', 'higher', 'archived'),
  seed('waterline-length-unleashed', 'Mid-waterline length – unleashed, single line', 'Length', 'm', 'higher', 'archived'),

  // Highline length
  seed('highline-length', 'Highline length', 'Length', 'm', 'higher'),
  seed('highline-length-polyester', 'Highline length – Polyester', 'Length', 'm', 'higher', 'archived'),
  seed('highline-length-polyamide', 'Highline length – Polyamide', 'Length', 'm', 'higher', 'archived'),
  seed('highline-length-urban', 'Highline length – Urban', 'Length', 'm', 'higher'),
  seed('highline-length-unicycle', 'Highline length – Unicycle', 'Length', 'm', 'higher'),
  seed('highline-length-tandem', 'Highline length – Tandem (two people holding hands)', 'Length', 'm', 'higher'),
  seed('highline-length-blind', 'Highline length – Blindfolded', 'Length', 'm', 'higher'),
  seed('highline-length-humanline', 'Highline length – Humanline', 'Length', 'm', 'higher'),
  seed('highline-length-underground', 'Highline length – Underground (cave)', 'Length', 'm', 'higher'),
  seed('highline-length-cable-cars', 'Highline length – Between cable cars', 'Length', 'm', 'higher'),

  // Highline height / depth
  seed('highline-height', 'Highline height above ground / water', 'Altitude', 'm', 'higher'),
  seed('highline-height-urban', 'Highline height – Urban, above ground / water', 'Altitude', 'm', 'higher'),
  seed('highline-height-altitude', 'Highline height above sea level', 'Altitude', 'm', 'higher'),
  seed('highline-depth-underground', 'Highline depth below ground (underground)', 'Altitude', 'm', 'higher'),

  // Speed highlines: time for the distance
  seed('speed-highline-60m', 'Speed highline – 60 m', 'Speed', 's', 'lower'),
  seed('speed-highline-100m', 'Speed highline – 100 m', 'Speed', 's', 'lower'),
  seed('speed-highline-200m', 'Speed highline – 200 m', 'Speed', 's', 'lower'),
  seed('speed-highline-300m', 'Speed highline – 300 m', 'Speed', 's', 'lower'),
  seed('speed-highline-400m', 'Speed highline – 400 m', 'Speed', 's', 'lower'),
  seed('speed-highline-100m-blind', 'Speed highline – 100 m blindfolded', 'Speed', 's', 'lower'),

  // Speedlines over ground
  seed('speedline-14-5m', 'Speedline over ground – 14.5 m', 'Speed', 's', 'lower'),
  seed('speedline-29m', 'Speedline over ground – 29 m', 'Speed', 's', 'lower'),

  // Endurance
  seed('endurance-slackline-1h', 'Slackline distance in 1 hour', 'Endurance', 'm', 'higher'),
  seed('endurance-highline-24h', 'Highline distance in 24 hours (with pauses)', 'Endurance', 'm', 'higher'),
  seed('endurance-slackline-24h', 'Slackline distance in 24 hours (with pauses)', 'Endurance', 'm', 'higher'),
  seed('endurance-highline-72h', 'Highline distance in 3 days (72 hours)', 'Endurance', 'm', 'higher'),
  seed('endurance-highline-blind', 'Highline distance blindfolded without falling', 'Endurance', 'm', 'higher'),
  seed('endurance-slackline-31d', 'Slackline distance in one month (31 days)', 'Endurance', 'm', 'higher'),
  seed('endurance-standing-walking', 'Longest duration standing / walking on a slackline', 'Endurance', 's', 'higher'),
  seed('endurance-surfing', 'Longest duration surfing on a rodeo- / slackline', 'Endurance', 's', 'higher'),
  seed('endurance-living-highline', 'Longest duration living on a highline', 'Endurance', 's', 'higher'),

  // Trick records
  seed('trick-high-jump', 'High jump over pole (feet to feet) on a trickline', 'Other', 'm', 'higher'),
  seed('trick-front-flips', 'Most front flips feet to feet in a row on a trickline', 'Other', 'count', 'higher'),
  seed('trick-handstand-slackline', 'Longest duration handstand on a slackline over ground', 'Other', 's', 'higher'),
  seed('trick-handstand-highline', 'Longest duration handstand on a highline', 'Other', 's', 'higher'),
  seed('trick-juggling-3-clubs', 'Longest distance walk juggling three clubs', 'Other', 'm', 'higher'),
  seed('trick-juggling-5-clubs', 'Longest distance walk juggling five clubs', 'Other', 'm', 'higher'),
  seed('trick-juggling-duration', 'Longest duration juggling on a slackline', 'Other', 's', 'higher'),
  seed('trick-football', 'Longest duration controlling a football on an elevated slackline', 'Other', 's', 'higher'),
  seed('trick-skips', 'Most consecutive skips on a slackline', 'Other', 'count', 'higher'),
  seed('trick-elbow-lever', 'Longest duration one arm elbow lever on a slackline', 'Other', 's', 'higher'),
  seed('trick-davinci-spins', 'Most spins on four slacklines (Da Vinci slackline) in one minute', 'Other', 'count', 'higher'),

  // Rigging
  seed('rigging-solo-rig-derig', 'Longest line solo-rig and derig', 'Other', 'm', 'higher'),
  seed('rigging-solo-most-lines-24h', 'Most different lines solo-rigged, derigged and sent in 24 hours', 'Other', 'count', 'higher'),
  seed('rigging-group-most-lines-24h', 'Most lines rigged and sent in 24 hours (in a group)', 'Other', 'count', 'higher'),
  // One category for north and south: compared by absolute latitude (FR-C6)
  seed('rigging-northern-southern', 'Geographically most northern / southern highline rig', 'Other', '°', 'higher'),
];

type FirstCategorySeed = Pick<FirstCategoryTableItem, 'categoryId' | 'name' | 'terminationRule' | 'status'>;

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

export const buildRecordCategoryRecords = (now = Date.now()): RecordCategoryTableItem[] =>
  RECORD_CATEGORY_SEEDS.map((seed, order) => ({
    pk: 'RecordCategory',
    sortKey: `RecordCategory:${seed.categoryId}`,
    ...seed,
    order,
    createdAt: now,
    updatedAt: now,
  }));

export const buildFirstCategoryRecords = (now = Date.now()): FirstCategoryTableItem[] =>
  FIRST_CATEGORY_SEEDS.map((seed, order) => ({
    pk: 'FirstCategory',
    sortKey: `FirstCategory:${seed.categoryId}`,
    ...seed,
    order,
    createdAt: now,
    updatedAt: now,
  }));
