import { MAP_CONTEST_TYPE_ENUM_TO_NAME } from '@utils/consts';

export const CONTEST_SIZE_TIERS: ContestType[] = [
  'CHALLENGE',
  'OPEN',
  'GRAND_SLAM',
  'MASTERS',
  'WORLD_CUP',
  'WORLD_CHAMPIONSHIP',
];

export const normalizeContestSize = (
  contestSize: number | string | null | undefined,
): ContestType | undefined => {
  const raw = String(contestSize ?? '').trim();
  if (!raw) return undefined;

  const upper = raw.toUpperCase().replace(/\s+/g, '_');
  if (CONTEST_SIZE_TIERS.includes(upper as ContestType)) {
    return upper as ContestType;
  }

  const fromEnum = MAP_CONTEST_TYPE_ENUM_TO_NAME[Number(raw)];
  if (fromEnum) return fromEnum;

  return undefined;
};

export const getContestSizeTrophyCount = (contestSize: ContestType) =>
  CONTEST_SIZE_TIERS.indexOf(contestSize) + 1;
