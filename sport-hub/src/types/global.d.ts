
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

type Disciplines = 'speed-highline' | 'freestyle-highline' | 'speed-short';

type Roles = 'Athlete' | 'Judge' | 'Organiser';
