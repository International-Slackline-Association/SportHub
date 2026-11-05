type fixedPoints=  number[];

const FIXED_POINTS_BY_CONTEST_SIZE: Record<ContestType, fixedPoints> = {
  CHALLENGE: [200, 167, 139],
  OPEN: [300, 250, 208],
  GRAND_SLAM:[600, 500, 417],
  MASTERS:  [900, 750, 625, 521],
  WORLD_CUP: [2000, 1667, 1389, 1157, 965],
  WORLD_CHAMPIONSHIP: [3000, 2400, 1920, 1536, 1229, 983]
}
/**
 * Each comp level sets a fixed points for the top levels
 * places m..N (the field size) decay linearly to zero at place N+1.
 * 
 * P(r) = fixedPoints(r-1)                       for r = 1..m
 * P(r) = P(m) * (1 - ((r-m) / (N-m+1)))          for r = m..N
 *  
 * where r = rank, m = minimum number of contestants, P(m) = points of last fixed rank m, N = number of contestants
 * 
 * e.g. for a men's Masters contest with 7 contestants:
 * the top 4 ranks will receive fixed points
 * the bottom 3 ranks will receive 3/4, 2/4, and 1/4 of the points for rank 4 (formula two)
 */

export const calculatePointsForRank = (rank: number, contestSize: ContestType,numContestants: number) => {
  const fixedPoints = FIXED_POINTS_BY_CONTEST_SIZE[contestSize];
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
/**
 * Recalculate every ranked result's points from rank, contest size and field size.
 * Tied ranks get equal points. Results without a rank, or contests without a
 * size, are returned unchanged.
 */
export const withCalculatedPoints = <T extends { rank?: number; isaPoints?: number }>(
  results: T[],
  contestSize: ContestType | undefined,
): T[] => {
  if (!contestSize || !FIXED_POINTS_BY_CONTEST_SIZE[contestSize]) return results;
  return results.map((result) => {
    const rank = Number(result.rank);
    return rank > 0
      ? { ...result, isaPoints: calculatePointsForRank(rank, contestSize, results.length) }
      : result;
  });
};
