import { relationalQueries } from '@lib/relational-transform';

// NOTE: This page uses the original mocks data and shows examples of how to relate data

export default function RelationalDemo() {
  // Get all available contests and pick the first one with participants
  const allContests = relationalQueries.searchContests('');
  const contestsWithParticipants = allContests.filter(c => (c.participantCount || 0) > 0);
  const sampleContest = contestsWithParticipants[0] || allContests[0];

  // Example lookups - handle case where no data is available
  const sampleUser = relationalQueries.searchUsers('Friedi')[0] || relationalQueries.searchUsers('')[0];
  const leaderboard = relationalQueries.getLeaderboard(10);

  const userWithResults = sampleUser ? relationalQueries.getUserWithResults(sampleUser.athleteId) : null;
  const contestWithParticipants = sampleContest ? relationalQueries.getContestWithParticipants(sampleContest.contestId) : null;
  const contestResults = sampleContest ? relationalQueries.getContestResults(sampleContest.contestId) : [];
  const userContests = sampleUser ? relationalQueries.getUserContests(sampleUser.athleteId) : [];

  // Debug info
  console.log('Debug - Total contests:', allContests.length);
  console.log('Debug - Contests with participants:', contestsWithParticipants.length);
  console.log('Debug - Sample contest:', sampleContest?.name, 'ID:', sampleContest?.contestId);
  console.log('Debug - Contest results count:', contestResults.length);
  console.log('Debug - Contest participants count:', contestWithParticipants?.participants.length);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Relational Data Structure Demo</h1>
        <p className="text-gray-600">
          Showcasing efficient lookups without data redundancy
        </p>
        {leaderboard.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <p className="text-yellow-800">
              ⚠️ No contest data loaded. Make sure the mock data is available and try refreshing the page.
            </p>
          </div>
        )}

      </div>

      {/* User Lookup Demo */}
      {userWithResults && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">User Profile & Results</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Profile: {userWithResults.name}</h3>
              <div className="space-y-1 text-sm">
                <div><strong>ID:</strong> {userWithResults.athleteId}</div>
                <div><strong>Country:</strong> {userWithResults.country}</div>
                <div><strong>Total Points:</strong> {userWithResults.totalPoints}</div>
                <div><strong>Contests:</strong> {userWithResults.contestsParticipated}</div>
                <div><strong>Career Span:</strong> {userWithResults.firstCompetition} → {userWithResults.lastCompetition}</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Recent Results ({userWithResults.results.length} total)</h3>
              <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                {userWithResults.results.slice(0, 5).map((result, i) => (
                  <div key={i} className="flex justify-between border-b pb-1">
                    <span>Contest #{result.contestId}</span>
                    <span>Place: {result.place} ({result.points}pts)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contest Lookup Demo */}
      {contestWithParticipants && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contest Results</h2>

          {/* Contest Details */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-lg mb-2">{contestWithParticipants.name}</h3>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div><strong>Date:</strong> {contestWithParticipants.date}</div>
              <div><strong>Location:</strong> {contestWithParticipants.city}, {contestWithParticipants.country}</div>
              <div><strong>Discipline:</strong> {contestWithParticipants.discipline}</div>
              <div><strong>Participants:</strong> {contestWithParticipants.participantCount}</div>
            </div>
          </div>

          {/* Results Table */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Contest Results ({contestResults.length} participants)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Place</th>
                    <th className="text-left p-2">Athlete Name</th>
                    <th className="text-left p-2">Athlete ID</th>
                    <th className="text-center p-2">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {contestResults.slice(0, 15).map((result, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-semibold">{result.place}</td>
                      <td className="p-2">{result.athleteName}</td>
                      <td className="p-2 font-mono text-xs text-gray-500">{result.athleteId}</td>
                      <td className="p-2 text-center font-semibold">{result.points}</td>
                    </tr>
                  ))}
                  {contestResults.length > 15 && (
                    <tr className="border-b bg-gray-50">
                      <td colSpan={4} className="p-2 text-center text-gray-500 italic">
                        ... and {contestResults.length - 15} more participants
                      </td>
                    </tr>
                  )}
                  {contestResults.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-500 italic">
                        No contest results available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User's Contest History */}
      {userContests.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Contest History: {sampleUser?.name} ({userContests.length} contests)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Contest</th>
                  <th className="text-left p-2">Discipline</th>
                  <th className="text-center p-2">Place</th>
                  <th className="text-center p-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {userContests.slice(0, 10).map((contest, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{contest.date}</td>
                    <td className="p-2">{contest.contestName}</td>
                    <td className="p-2">{contest.discipline}</td>
                    <td className="p-2 text-center">{contest.place}</td>
                    <td className="p-2 text-center">{contest.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Top Athletes Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Rank</th>
                <th className="text-left p-2">Athlete</th>
                <th className="text-left p-2">Country</th>
                <th className="text-center p-2">Total Points</th>
                <th className="text-center p-2">Contests</th>
                <th className="text-center p-2">Avg Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((athlete, i) => (
                <tr key={athlete.athleteId} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-bold">{i + 1}</td>
                  <td className="p-2">{athlete.name}</td>
                  <td className="p-2 uppercase">{athlete.country}</td>
                  <td className="p-2 text-center font-mono">{athlete.totalPoints}</td>
                  <td className="p-2 text-center">{athlete.contestsParticipated}</td>
                  <td className="p-2 text-center">
                    {Math.round((athlete.totalPoints || 0) / (athlete.contestsParticipated || 1))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Examples */}
      <div className="bg-gray-50 p-6 rounded-lg mt-8">
        <h2 className="text-2xl font-semibold mb-4">Available API Functions</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">User-Centric</h3>
            <ul className="space-y-1 font-mono">
              <li>getUserWithResults(athleteId)</li>
              <li>getUserContests(athleteId)</li>
              <li>searchUsers(namePattern)</li>
              <li>getLeaderboard(limit)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Contest-Centric</h3>
            <ul className="space-y-1 font-mono">
              <li>getContestWithParticipants(contestId)</li>
              <li>getContestResults(contestId)</li>
              <li>searchContests(namePattern)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}