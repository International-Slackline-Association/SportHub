type ContestPointVariables = {
  fixedPointsWomen: number[];
  fixedPointsMen: number[];
  ratio: number;
}

const VARIABLES_BY_CONTEST_SIZE: Record<ContestType, ContestPointVariables> = {
  CHALLENGE: {
    fixedPointsWomen: [200, 167, 139],
    fixedPointsMen: [200, 167, 139],
    ratio: 1.2
  },
  OPEN: {
    fixedPointsWomen: [300, 250, 208],
    fixedPointsMen: [300, 250, 208],
    ratio: 1.2
  },
  GRAND_SLAM: {
    fixedPointsWomen: [600, 500, 417],
    fixedPointsMen: [600, 500, 417, 347, 289],
    ratio: 1.2
  },
  MASTERS: {
    fixedPointsWomen: [900, 750, 625, 521],
    fixedPointsMen: [900, 750, 625, 521, 434, 362, 301],
    ratio: 1.2
  },
  WORLD_CUP: {
    fixedPointsWomen: [2000, 1667, 1389, 1157, 965],
    fixedPointsMen: [2000, 1667, 1389, 1157, 965, 804, 670, 558, 465],
    ratio: 1.2
  },
  WORLD_CHAMPIONSHIP: {
    fixedPointsWomen: [3000, 2400, 1920, 1536, 1229, 983],
    fixedPointsMen: [3000, 2400, 1920, 1536, 1229, 983, 786, 629, 503, 403, 322],
    ratio: 1.25
  },
};

/**
 * Each tier sets a top score and a decay ratio. Places 1..m (top ranks) use a pure geometric decay;
 * places m..N (the field size) decay linearly to zero at place N+1.
 * 
 * P(k) = max / ratio^(k-1)                       for k = 1..m
 * P(k) = P(m) * (1 - ((k-m) / (N-m+1)))          for k = m..N
 *  
 * where k = rank, m = minContestants, N = numContestants, max = points of rank 1, ratio = decay ratio
 * 
 * e.g. for a men's Masters contest with 10 contestants:
 * the top 7 ranks will receive fixed points (formula one)
 * the bottom 3 ranks will receive 3/4, 2/4, and 1/4 of the points for rank 7 (formula two)
 */

export const calculatePointsForRank = (rank: number, contestSize: ContestType, gender: Gender, numContestants: number) => {
  const { fixedPointsWomen, fixedPointsMen } = VARIABLES_BY_CONTEST_SIZE[contestSize];
  const isContestMenOnly = ["MEN", "MEN_ONLY", "1"].includes(gender);
  const fixedPoints = isContestMenOnly ? fixedPointsMen : fixedPointsWomen;
  const minContestants = fixedPoints.length;

  if (rank <= minContestants) {
    return fixedPoints[rank - 1];
  }

  const numExtraContestants = Math.max(0, numContestants - minContestants);
  const pointsOfLastTopRank = fixedPoints[minContestants - 1];
  const stepLowerRanks = pointsOfLastTopRank / (numExtraContestants + 1);
  const pointsForLowerRank = pointsOfLastTopRank - (rank - minContestants) * stepLowerRanks;

  // Atleast 1 point awarded for participation
  return Math.max(1, Math.round(pointsForLowerRank));
};
