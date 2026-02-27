
interface Athlete {
  athleteId: string;
  name: string;
  place: string;
  points: number;
};

interface Contest {
  athletes: Athlete[];
  category: number;
  city: string;
  contestId: string;
  country: string;
  createdAt: string;
  date: string;
  discipline: string;
  gender: number;
  infoUrl?: string;
  name: string;
  normalizedName: string;
  prize: number;
  profileUrl: string;
  thumbnailUrl: string;
  verified: boolean;
};

interface Ranking {
  athleteId: string;
  ageCategory: string;
  country: string;
  disciplines: string[];
  fullName?: string;
  gender: string;
  name: string;
  points: number;
  surname: string;
}

interface User {
  userId?: string;
  id: string;
  name: string;
  email: string;
  createdAt: string;
  athleteId?: string;
  country?: string;
  firstCompetition?: string;
  lastCompetition?: string;
  updatedAt?: string;
  totalPoints?: number;
  contestsParticipated?: number;
}

type Discipline = "OVERALL" | "TRICKLINE" | "TRICKLINE_AERIAL" | "TRICKLINE_JIB_AND_STATIC" | "TRICKLINE_TRANSFER" | "FREESTYLE_HIGHLINE" | "SPEED" | "SPEED_SHORT" | "SPEED_HIGHLINE" | "ENDURANCE" | "BLIND" | "RIGGING" | "FREESTYLE" | "WALKING";

type Role = "ATHLETE" | "JUDGE" | "ISA_VERIFIED" | "ORGANIZER";

type Gender = "ALL" | "MEN" | "WOMEN" | "OTHER";

type AgeCategory = "ALL" | "YOUTH" | "SENIOR";

type RankingType = "TOP_SCORE" | "POINT_SCORE";

type ContestType = "WORLD_CHAMPIONSHIP" | "WORLD_CUP" | "MASTERS" | "GRAND_SLAM" | "OPEN" | "CHALLENGE";

type ContestGender = "MIXED" | "MEN_ONLY" | "WOMEN_ONLY";

type JudgingSystem = "ISA_FREESTYLE" | "ISA_SPEED" | "OTHER";
