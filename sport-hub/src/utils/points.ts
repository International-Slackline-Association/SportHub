type ContestPointVariables = {
  maxRank: number;
  minContestantsFemale: number;
  minContestantsMale: number;
  ratio: number;
  maxPoints: number;
}

const VARIABLES_BY_CONTEST_SIZE: Record<ContestSize, ContestPointVariables> = {
  CHALLENGE: {
    maxPoints: 200,
    maxRank: 5,
    minContestantsFemale: 3,
    minContestantsMale: 3,
    ratio: 1.2
  },
  OPEN: {
    maxPoints: 300,
    maxRank: 7,
    minContestantsFemale: 3,
    minContestantsMale: 3,
    ratio: 1.2
  },
  GRAND_SLAM: {
    maxPoints: 600,
    maxRank: 8,
    minContestantsFemale: 3,
    minContestantsMale: 5,
    ratio: 1.2
  },
  MASTERS: {
    maxPoints: 900,
    maxRank: 12,
    minContestantsFemale: 4,
    minContestantsMale: 7,
    ratio: 1.2
  },
  WORLD_CUP: {
    maxPoints: 2000,
    maxRank: 11,
    minContestantsFemale: 5,
    minContestantsMale: 9,
    ratio: 1.2
  },
  WORLD_CHAMPIONSHIP: {
    maxPoints: 3000,
    maxRank: 15,
    minContestantsFemale: 6,
    minContestantsMale: 11,
    ratio: 1.25
  },
};

export const calculatePointsForRank = (rank: number, contestSize: ContestSize) => {
  const { maxPoints, maxRank, minContestantsFemale, ratio } = VARIABLES_BY_CONTEST_SIZE[contestSize];

  if (rank > maxRank) {
    return 0;
  }

  // Fixed points, reserved for top ranks
  if (rank < minContestantsFemale) {
    const points = maxPoints / Math.pow(ratio, rank - 1);
    return Math.round(points);
  }

  // Dynamic points
  const lastFixedPoints = maxPoints / Math.pow(ratio, minContestantsFemale - 1);
  const factor = Math.max(0, 1 - ((rank - minContestantsFemale) / (maxRank - minContestantsFemale + 1)));
  const points = lastFixedPoints * factor;
  return Math.round(points);
};
