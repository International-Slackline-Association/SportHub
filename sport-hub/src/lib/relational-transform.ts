import contestsData from '@mocks/contests_with_athletes.json';
// Contest type is available globally from types/global.d.ts
import {
  UserRecord,
  ContestRecord,
  ResultRecord,
  ParticipantRecord,
  UserWithResults,
  ContestWithParticipants,
  UserContestSummary
} from './relational-types';

// Transform mock data into proper relational structure
export function transformToRelationalData(): {
  users: UserRecord[];
  contests: ContestRecord[];
  results: ResultRecord[];
  participants: ParticipantRecord[];
} {
  const users = new Map<string, UserRecord>();
  const contests: ContestRecord[] = [];
  const results: ResultRecord[] = [];
  const participants: ParticipantRecord[] = [];

  const contestsTyped = (contestsData as Contest[]) || [];

  if (!contestsTyped || contestsTyped.length === 0) {
    console.warn('No contest data available for transformation');
    return { users: [], contests: [], results: [], participants: [] };
  }

  contestsTyped.forEach((contest) => {
    // Create contest record
    const contestRecord: ContestRecord = {
      pk: `CONTEST#${contest.contestId}`,
      sk: 'DETAILS',
      contestId: contest.contestId,
      name: contest.name,
      normalizedName: contest.name.toLowerCase(),
      discipline: contest.discipline,
      date: contest.date,
      country: contest.country,
      city: contest.city,
      prize: contest.prize,
      gender: contest.gender,
      category: contest.category,
      createdAt: new Date().toISOString(),
      participantCount: contest.athletes.length,
      athleteCount: contest.athletes.length,
      // Legacy compatibility
      'contests-key': contest.contestId,
    };
    contests.push(contestRecord);

    // Process athletes
    contest.athletes.forEach((athlete) => {
      const userPk = `USER#${athlete.athleteId}`;

      // Create or update user record
      if (!users.has(athlete.athleteId)) {
        const userRecord: UserRecord = {
          pk: userPk,
          sk: 'PROFILE',
          athleteId: athlete.athleteId,
          name: athlete.name,
          email: `${athlete.athleteId.replace(/[^a-zA-Z0-9]/g, '')}@athlete.local`,
          country: contest.country, // Use first contest's country as primary
          createdAt: new Date().toISOString(),
          totalPoints: 0,
          contestsParticipated: 0,
          firstCompetition: contest.date,
          lastCompetition: contest.date,
          // Legacy compatibility
          'rankings-dev-key': athlete.athleteId,
          id: athlete.athleteId,
        };
        users.set(athlete.athleteId, userRecord);
      }

      // Update user statistics
      const user = users.get(athlete.athleteId)!;
      user.totalPoints = (user.totalPoints || 0) + athlete.points;
      user.contestsParticipated = (user.contestsParticipated || 0) + 1;

      // Update date range
      if (!user.firstCompetition || contest.date < user.firstCompetition) {
        user.firstCompetition = contest.date;
      }
      if (!user.lastCompetition || contest.date > user.lastCompetition) {
        user.lastCompetition = contest.date;
      }

      // Create result record
      const resultRecord: ResultRecord = {
        pk: userPk,
        sk: `RESULT#${contest.contestId}`,
        athleteId: athlete.athleteId,
        contestId: contest.contestId,
        place: athlete.place,
        points: athlete.points,
        createdAt: new Date().toISOString(),
        // GSI for contest-centric queries
        gsi1pk: `CONTEST#${contest.contestId}`,
        gsi1sk: `USER#${athlete.athleteId}#${athlete.place.padStart(3, '0')}`,
      };
      results.push(resultRecord);

      // Create participant record
      const participantRecord: ParticipantRecord = {
        pk: `CONTEST#${contest.contestId}`,
        sk: `PARTICIPANT#${athlete.athleteId}`,
        contestId: contest.contestId,
        athleteId: athlete.athleteId,
        place: athlete.place,
        points: athlete.points,
        placeNumeric: parseInt(athlete.place) || 999, // For sorting (DNF = 999)
        createdAt: new Date().toISOString(),
      };
      participants.push(participantRecord);
    });
  });

  return {
    users: Array.from(users.values()),
    contests,
    results,
    participants
  };
}

// Lookup functions for relational queries
export class RelationalQueries {
  private users: Map<string, UserRecord>;
  private contests: Map<string, ContestRecord>;
  private resultsByUser: Map<string, ResultRecord[]>;
  private participantsByContest: Map<string, ParticipantRecord[]>;

  constructor() {
    const data = transformToRelationalData();

    // Initialize all maps first
    this.users = new Map(data.users.map(u => [u.athleteId, u]));
    this.contests = new Map(data.contests.map(c => [c.contestId, c]));
    this.resultsByUser = new Map();
    this.participantsByContest = new Map();

    // Build result index by user
    data.results.forEach(result => {
      if (!this.resultsByUser.has(result.athleteId)) {
        this.resultsByUser.set(result.athleteId, []);
      }
      this.resultsByUser.get(result.athleteId)!.push(result);
    });

    // Build participant index by contest
    data.participants.forEach(participant => {
      if (!this.participantsByContest.has(participant.contestId)) {
        this.participantsByContest.set(participant.contestId, []);
      }
      this.participantsByContest.get(participant.contestId)!.push(participant);
    });

    // Log after everything is initialized
    console.log(`Loaded ${data.users.length} users, ${data.contests.length} contests, ${data.results.length} results, ${data.participants.length} participants`);
    console.log(`Participants by contest map has ${this.participantsByContest.size} entries`);
  }

  // Get user with all their results
  getUserWithResults(athleteId: string): UserWithResults | null {
    const user = this.users.get(athleteId);
    if (!user) return null;

    const results = this.resultsByUser.get(athleteId) || [];
    return { ...user, results };
  }

  // Get contest with all participants
  getContestWithParticipants(contestId: string): ContestWithParticipants | null {
    const contest = this.contests.get(contestId);
    if (!contest) return null;

    const participants = this.participantsByContest.get(contestId) || [];
    // Sort by place (numeric)
    participants.sort((a, b) => (a.placeNumeric || 999) - (b.placeNumeric || 999));

    return { ...contest, participants };
  }

  // Get all contests a user participated in
  getUserContests(athleteId: string): UserContestSummary[] {
    const results = this.resultsByUser.get(athleteId) || [];
    const user = this.users.get(athleteId);

    return results.map(result => {
      const contest = this.contests.get(result.contestId);
      return {
        athleteId: result.athleteId,
        athleteName: user?.name || 'Unknown',
        contestId: result.contestId,
        contestName: contest?.name || 'Unknown Contest',
        place: result.place,
        points: result.points,
        date: contest?.date || '',
        discipline: contest?.discipline || ''
      };
    }).sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
  }

  // Get top athletes in a specific contest
  getContestResults(contestId: string): UserContestSummary[] {
    const participants = this.participantsByContest.get(contestId) || [];
    const contest = this.contests.get(contestId);

    console.log(`getContestResults for ${contestId}: found ${participants.length} participants`);
    if (participants.length === 0) {
      console.log('Available contest IDs:', Array.from(this.participantsByContest.keys()).slice(0, 5));
    }

    return participants.map(participant => {
      const user = this.users.get(participant.athleteId);
      return {
        athleteId: participant.athleteId,
        athleteName: user?.name || 'Unknown',
        contestId: participant.contestId,
        contestName: contest?.name || 'Unknown Contest',
        place: participant.place,
        points: participant.points,
        date: contest?.date || '',
        discipline: contest?.discipline || ''
      };
    }).sort((a, b) => (parseInt(a.place) || 999) - (parseInt(b.place) || 999));
  }

  // Search users by name
  searchUsers(namePattern: string): UserRecord[] {
    const pattern = namePattern.toLowerCase();
    return Array.from(this.users.values())
      .filter(user => user.name.toLowerCase().includes(pattern))
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  }

  // Search contests by name
  searchContests(namePattern: string): ContestRecord[] {
    const pattern = namePattern.toLowerCase();
    return Array.from(this.contests.values())
      .filter(contest => contest.normalizedName.includes(pattern))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  // Get leaderboard (top athletes by total points)
  getLeaderboard(limit: number = 50): UserRecord[] {
    return Array.from(this.users.values())
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
      .slice(0, limit);
  }
}

// Export singleton instance
export const relationalQueries = new RelationalQueries();