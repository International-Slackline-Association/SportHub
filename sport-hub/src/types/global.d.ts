
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

type Disciplines = 'speed-highline' | 'freestyle-highline' | 'speed-short' | 'trickline';

type Roles = 'Athlete' | 'Judge' | 'Organiser';
