import type { Metadata } from 'next';
import { testHelpers } from '@lib/test-helpers';
import { getDataStats } from '@lib/seed-data';
import LocalTestInterface from './LocalTestInterface';

export const metadata: Metadata = {
  title: 'SportHub - Local Database Testing',
};

export default async function LocalTestPage() {
  // Check if test environment is ready
  const envStatus = await testHelpers.isTestEnvironmentReady();

  // Only get stats if tables exist
  let stats = {
    tables: { rankings: 0, contests: 0, athletes: 0 },
    testDataCount: 0,
    realDataCount: 0
  };

  if (envStatus.ready) {
    try {
      stats = await testHelpers.getTestStats();
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  // Get data statistics
  const dataStats = getDataStats();

  // Get sample data only if environment is ready
  let sampleUsers = null;
  let sampleContests = null;
  let sampleAthletes = null;

  if (envStatus.ready) {
    try {
      const users = await testHelpers.getAllUsers();
      const contests = await testHelpers.getAllContests();
      const athletes = await testHelpers.getAllAthletes();

      sampleUsers = users.slice(0, 5);
      sampleContests = contests.slice(0, 3);
      sampleAthletes = athletes.slice(0, 10);
    } catch (error) {
      console.error('Error fetching sample data:', error);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Local DynamoDB Testing</h1>
        <p className="text-gray-600">
          Test and interact with your local DynamoDB instance
        </p>
      </div>

      {/* Environment Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
              envStatus.ready ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            Environment Status
          </h2>
          {envStatus.ready ? (
            <div className="text-green-600">
              ✅ All tables are ready
            </div>
          ) : (
            <div>
              <div className="text-red-600 mb-2">
                ❌ Missing tables: {envStatus.missing.join(', ')}
              </div>
              <p className="text-sm text-gray-600">
                Run <code className="bg-gray-100 px-1 rounded">pnpm db:setup</code> to create missing tables
              </p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Current Data</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Users:</span>
              <span className="font-mono">{stats.tables.rankings || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Contests:</span>
              <span className="font-mono">{stats.tables.contests || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Athletes:</span>
              <span className="font-mono">{stats.tables.athletes || 0}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span>Test Data:</span>
                <span className="font-mono">{stats.testDataCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Mock Data:</span>
                <span className="font-mono">{stats.realDataCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Mock Data Stats */}
      <div className="bg-blue-50 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Mock Data</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.totalUsers}</div>
            <div className="text-sm text-gray-600">Unique Athletes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.totalAthleteEntries}</div>
            <div className="text-sm text-gray-600">Athlete Entries</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.totalContests}</div>
            <div className="text-sm text-gray-600">Contests</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.disciplines.length}</div>
            <div className="text-sm text-gray-600">Disciplines</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.countries.length}</div>
            <div className="text-sm text-gray-600">Countries</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <strong>Date Range:</strong> {dataStats.dateRange.earliest} to {dataStats.dateRange.latest}
        </div>
      </div>

      {/* Interactive Interface */}
      <LocalTestInterface
        envReady={envStatus.ready}
        initialStats={stats}
      />

      {/* Sample Data Display */}
      {envStatus.ready && (sampleUsers || sampleContests || sampleAthletes) && (
        <div className="mt-8 space-y-8">
          {/* Sample Users */}
          {sampleUsers && sampleUsers.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Sample Users</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Total Points</th>
                      <th className="text-left p-2">Contests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">{user.id}</td>
                        <td className="p-2">{user.name}</td>
                        <td className="p-2">{user.email}</td>
                        <td className="p-2">{user.totalPoints || 0}</td>
                        <td className="p-2">{user.contestsParticipated || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sample Contests */}
          {sampleContests && sampleContests.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Sample Contests</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Country</th>
                      <th className="text-left p-2">Athletes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleContests.map((contest) => (
                      <tr key={contest.contestId} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">{contest.contestId}</td>
                        <td className="p-2">{contest.name}</td>
                        <td className="p-2">{contest.date}</td>
                        <td className="p-2 uppercase">{contest.country}</td>
                        <td className="p-2">{contest.athleteCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sample Athletes */}
          {sampleAthletes && sampleAthletes.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Sample Athlete Entries</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Athlete</th>
                      <th className="text-left p-2">Contest</th>
                      <th className="text-left p-2">Place</th>
                      <th className="text-left p-2">Points</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleAthletes.map((athlete) => (
                      <tr key={athlete['athletes-key']} className="border-b hover:bg-gray-50">
                        <td className="p-2">{athlete.name}</td>
                        <td className="p-2">{athlete.contestName}</td>
                        <td className="p-2 text-center">{athlete.place}</td>
                        <td className="p-2 text-center">{athlete.points}</td>
                        <td className="p-2">{athlete.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}