import contestsData from '@mocks/contests_with_athletes.json';

export interface Contest {
  contestId: string;
  discipline: string;
  date: string;
  name: string;
  prize: number;
  createdAt: string;
  profileUrl?: string;
  country: string;
  gender: number;
  city: string;
  category: number;
  normalizedName: string;
  thumbnailUrl?: string;
  athletes: Athlete[];
}

export interface Athlete {
  athleteId: string;
  name: string;
  place: string;
  points: number;
}

export interface UserRecord {
  'rankings-dev-key': string;
  id: string;
  name: string;
  email: string;
  createdAt: string;
  athleteId?: string;
  totalPoints?: number;
  contestsParticipated?: number;
}

export interface ContestRecord {
  'contests-key': string;
  contestId: string;
  discipline: string;
  date: string;
  name: string;
  normalizedName: string;
  prize: number;
  country: string;
  gender: number;
  city: string;
  category: number;
  createdAt: string;
  profileUrl?: string;
  thumbnailUrl?: string;
  athleteCount: number;
}

export interface AthleteRecord {
  'athletes-key': string;
  athleteId: string;
  name: string;
  contestId: string;
  contestName: string;
  place: string;
  points: number;
  date: string;
  country: string;
  discipline: string;
  createdAt: string;
}

// Transform mock data into DynamoDB format
export function transformContestsData(): {
  users: UserRecord[];
  contests: ContestRecord[];
  athletes: AthleteRecord[];
} {
  const users = new Map<string, UserRecord>();
  const contests: ContestRecord[] = [];
  const athletes: AthleteRecord[] = [];

  // Cast the imported data to Contest array
  const contestsTyped = contestsData as Contest[];

  contestsTyped.forEach((contest) => {
    // Transform contest
    const contestRecord: ContestRecord = {
      'contests-key': contest.contestId,
      contestId: contest.contestId,
      discipline: contest.discipline,
      date: contest.date,
      name: contest.name,
      normalizedName: contest.normalizedName,
      prize: contest.prize,
      country: contest.country,
      gender: contest.gender,
      city: contest.city,
      category: contest.category,
      createdAt: contest.createdAt,
      profileUrl: contest.profileUrl,
      thumbnailUrl: contest.thumbnailUrl,
      athleteCount: contest.athletes.length,
    };
    contests.push(contestRecord);

    // Transform athletes and aggregate user data
    contest.athletes.forEach((athlete) => {
      // Create athlete record
      const athleteRecord: AthleteRecord = {
        'athletes-key': `${athlete.athleteId}-${contest.contestId}`,
        athleteId: athlete.athleteId,
        name: athlete.name,
        contestId: contest.contestId,
        contestName: contest.name,
        place: athlete.place,
        points: athlete.points,
        date: contest.date,
        country: contest.country,
        discipline: contest.discipline,
        createdAt: new Date().toISOString(),
      };
      athletes.push(athleteRecord);

      // Aggregate user data
      if (users.has(athlete.athleteId)) {
        const existingUser = users.get(athlete.athleteId)!;
        existingUser.totalPoints = (existingUser.totalPoints || 0) + athlete.points;
        existingUser.contestsParticipated = (existingUser.contestsParticipated || 0) + 1;
      } else {
        const userRecord: UserRecord = {
          'rankings-dev-key': athlete.athleteId,
          id: athlete.athleteId,
          name: athlete.name,
          email: `${athlete.athleteId.replace('-', '.')}@sporthub.local`,
          createdAt: new Date().toISOString(),
          athleteId: athlete.athleteId,
          totalPoints: athlete.points,
          contestsParticipated: 1,
        };
        users.set(athlete.athleteId, userRecord);
      }
    });
  });

  return {
    users: Array.from(users.values()),
    contests,
    athletes,
  };
}

// Generate additional test users for variety
export function generateTestUsers(count: number = 10): UserRecord[] {
  const testUsers: UserRecord[] = [];
  const names = [
    'Alex Johnson', 'Sarah Davis', 'Mike Wilson', 'Emma Brown', 'Chris Garcia',
    'Lisa Martinez', 'David Anderson', 'Jennifer Taylor', 'Robert Thomas', 'Amanda White'
  ];

  for (let i = 0; i < count; i++) {
    const name = names[i % names.length];
    const id = `test-user-${i + 1}`;
    testUsers.push({
      'rankings-dev-key': id,
      id,
      name: `${name} ${i + 1}`,
      email: `test.user.${i + 1}@sporthub.local`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return testUsers;
}

// Data statistics for validation
export function getDataStats() {
  const data = transformContestsData();
  return {
    totalUsers: data.users.length,
    totalContests: data.contests.length,
    totalAthleteEntries: data.athletes.length,
    disciplines: [...new Set(data.contests.map(c => c.discipline))],
    countries: [...new Set(data.contests.map(c => c.country))],
    dateRange: {
      earliest: data.contests.reduce((min, c) => c.date < min ? c.date : min, data.contests[0]?.date),
      latest: data.contests.reduce((max, c) => c.date > max ? c.date : max, data.contests[0]?.date),
    }
  };
}