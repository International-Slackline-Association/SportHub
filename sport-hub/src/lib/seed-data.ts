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

export interface EventParticipation {
  eventId: string;
  eventName: string;
  place: string;
  points: number;
  date: string;
  discipline: string;
  country: string;
  category: number;
}

export interface UserRecord {
  userId: string;
  type: 'athlete' | 'official' | 'admin';
  name: string;
  email: string;
  createdAt: string;
  totalPoints: number;
  contestsParticipated: number;
  eventParticipations: EventParticipation[];
}

export interface EventParticipant {
  userId: string;
  name: string;
  place: string;
  points: number;
}

export interface EventRecord {
  eventId: string;
  type: 'contest' | 'clinic' | 'meetup';
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
  participants: EventParticipant[];
}

// Transform mock data into DynamoDB format
export function transformContestsData(): {
  users: UserRecord[];
  events: EventRecord[];
} {
  const users = new Map<string, UserRecord>();
  const events: EventRecord[] = [];

  // Cast the imported data to Contest array
  const contestsTyped = contestsData as Contest[];

  contestsTyped.forEach((contest) => {
    // Transform event participants
    const participants: EventParticipant[] = contest.athletes.map((athlete) => ({
      userId: athlete.athleteId,
      name: athlete.name,
      place: athlete.place,
      points: athlete.points,
    }));

    // Transform event record
    const eventRecord: EventRecord = {
      eventId: contest.contestId,
      type: 'contest',
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
      participants,
    };
    events.push(eventRecord);

    // Aggregate user data with embedded event participations
    contest.athletes.forEach((athlete) => {
      const participation: EventParticipation = {
        eventId: contest.contestId,
        eventName: contest.name,
        place: athlete.place,
        points: athlete.points,
        date: contest.date,
        discipline: contest.discipline,
        country: contest.country,
        category: contest.category,
      };

      if (users.has(athlete.athleteId)) {
        const existingUser = users.get(athlete.athleteId)!;
        existingUser.totalPoints += athlete.points;
        existingUser.contestsParticipated += 1;
        existingUser.eventParticipations.push(participation);
      } else {
        const userRecord: UserRecord = {
          userId: athlete.athleteId,
          type: 'athlete',
          name: athlete.name,
          email: `${athlete.athleteId.replace('-', '.')}@sporthub.local`,
          createdAt: new Date().toISOString(),
          totalPoints: athlete.points,
          contestsParticipated: 1,
          eventParticipations: [participation],
        };
        users.set(athlete.athleteId, userRecord);
      }
    });
  });

  return {
    users: Array.from(users.values()),
    events,
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
      userId: id,
      type: 'athlete',
      name: `${name} ${i + 1}`,
      email: `test.user.${i + 1}@sporthub.local`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      totalPoints: 0,
      contestsParticipated: 0,
      eventParticipations: [],
    });
  }

  return testUsers;
}

// Data statistics for validation
export function getDataStats() {
  const data = transformContestsData();
  return {
    totalUsers: data.users.length,
    totalEvents: data.events.length,
    totalParticipations: data.users.reduce((sum, u) => sum + u.eventParticipations.length, 0),
    disciplines: [...new Set(data.events.map(e => e.discipline))],
    countries: [...new Set(data.events.map(e => e.country))],
    dateRange: {
      earliest: data.events.reduce((min, e) => e.date < min ? e.date : min, data.events[0]?.date),
      latest: data.events.reduce((max, e) => e.date > max ? e.date : max, data.events[0]?.date),
    }
  };
}