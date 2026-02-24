import type { Metadata } from 'next';
import { testHelpers } from '@lib/test-helpers';
import { getDataStats } from '@lib/migrations/seed-data';
import LocalTestInterface from './LocalTestInterface';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'SportHub - Local Database Testing',
};

// Force dynamic rendering to avoid build-time AWS calls
export const dynamic = 'force-dynamic';

export default async function LocalTestPage() {
  // This page is strictly for local development only
  if (process.env.DYNAMODB_LOCAL !== 'true') {
    redirect('/');
  }

  // Check if test environment is ready
  const envStatus = await testHelpers.isTestEnvironmentReady();

  // Only get stats if tables exist
  let stats = {
    tables: {} as Record<string, number>,
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

  if (envStatus.ready) {
    try {
      const users = await testHelpers.getAllUsers();
      const events = await testHelpers.getAllEvents();

      sampleUsers = users.slice(0, 5);
      sampleContests = events.slice(0, 3);
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
            <div className="text-sm font-semibold text-gray-600 mb-1">Users Table:</div>
            <div className="flex justify-between pl-4">
              <span className="text-sm">Profiles:</span>
              <span className="font-mono text-sm">{stats.tables['users-profiles'] || 0}</span>
            </div>
            <div className="flex justify-between pl-4">
              <span className="text-sm">Rankings:</span>
              <span className="font-mono text-sm">{stats.tables['users-rankings'] || 0}</span>
            </div>
            <div className="flex justify-between pl-4">
              <span className="text-sm">Participations:</span>
              <span className="font-mono text-sm">{stats.tables['users-participations'] || 0}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Users Records:</span>
              <span className="font-mono">{stats.tables['users-total'] || 0}</span>
            </div>
            <div className="border-t my-2"></div>
            <div className="text-sm font-semibold text-gray-600 mb-1">Events Table:</div>
            <div className="flex justify-between pl-4">
              <span className="text-sm">Event Metadata:</span>
              <span className="font-mono text-sm">{stats.tables['events-metadata'] || 0}</span>
            </div>
            <div className="flex justify-between pl-4">
              <span className="text-sm">Contests:</span>
              <span className="font-mono text-sm">{stats.tables['events-contests'] || 0}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Events Records:</span>
              <span className="font-mono">{stats.tables['events-total'] || 0}</span>
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
        <h2 className="text-xl font-semibold mb-4">Available Mock Data (from JSON files)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center mb-4">
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.userProfiles}</div>
            <div className="text-sm text-gray-600">Athlete Profiles</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.athleteRankings}</div>
            <div className="text-sm text-gray-600">Ranking Records</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.athleteParticipations}</div>
            <div className="text-sm text-gray-600">Participations</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.eventMetadata}</div>
            <div className="text-sm text-gray-600">Events</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{dataStats.contests}</div>
            <div className="text-sm text-gray-600">Contests</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">{dataStats.disciplines.length}</div>
            <div className="text-xs text-gray-600">Disciplines</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">{dataStats.countries.length}</div>
            <div className="text-xs text-gray-600">Countries</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600 border-t pt-4">
          <div><strong>Total User Records:</strong> {dataStats.totalUserRecords}</div>
          <div><strong>Total Event Records:</strong> {dataStats.totalEventRecords}</div>
          <div><strong>Date Range:</strong> {dataStats.dateRange.earliest} to {dataStats.dateRange.latest}</div>
        </div>
      </div>

      {/* Interactive Interface */}
      <LocalTestInterface
        envReady={envStatus.ready}
        initialStats={stats}
      />

      {/* Sample Data Display */}
      {envStatus.ready && (sampleUsers || sampleContests) && (
        <div className="mt-8 space-y-8">
          {/* Sample Users */}
          {sampleUsers && sampleUsers.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Sample User Profiles</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">User ID</th>
                      <th className="text-left p-2">Athlete Slug</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Total Points</th>
                      <th className="text-left p-2">Contests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleUsers.map((user) => (
                      <tr key={user.userId} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">{user.userId}</td>
                        <td className="p-2">{user.athleteSlug || 'N/A'}</td>
                        <td className="p-2">{user.primarySubType || 'N/A'}</td>
                        <td className="p-2">{user.totalPoints || 0}</td>
                        <td className="p-2">{user.contestCount || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sample Events */}
          {sampleContests && sampleContests.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Sample Event Metadata</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Event ID</th>
                      <th className="text-left p-2">Event Name</th>
                      <th className="text-left p-2">Dates</th>
                      <th className="text-left p-2">Country</th>
                      <th className="text-left p-2">Contests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleContests.map((event) => (
                      <tr key={event.eventId} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">{event.eventId}</td>
                        <td className="p-2">{event.eventName}</td>
                        <td className="p-2">{event.startDate}{event.endDate !== event.startDate ? ` - ${event.endDate}` : ''}</td>
                        <td className="p-2 uppercase">{event.country}</td>
                        <td className="p-2">{event.contestCount || 0}</td>
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