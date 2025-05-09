
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

type Disciplines = 'speed-highline' | 'freestyle-highline' | 'speed-short';

type Roles = 'Athlete' | 'Judge' | 'Organiser';
