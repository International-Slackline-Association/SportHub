
interface Athlete {
  athleteId: string;
  name: string;
  place: string;
  points: number;
};

interface Contest {
  contestId: string;
  discipline: string;
  date: string;
  name: string;
  prize: number;
  createdAt: string;
  profileUrl: string;
  country: string;
  gender: number;
  city: string;
  category: number;
  normalizedName: string;
  thumbnailUrl: string;
  athletes: Athlete[];
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
