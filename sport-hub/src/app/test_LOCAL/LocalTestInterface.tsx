'use client'

import { useState, useEffect } from 'react';

interface Stats {
  tables: Record<string, number>;
  testDataCount: number;
  realDataCount: number;
}

interface LocalTestInterfaceProps {
  envReady: boolean;
  initialStats: Stats;
}

export default function LocalTestInterface({ envReady, initialStats }: LocalTestInterfaceProps) {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  const refreshStats = async () => {
    try {
      setLoading(true);
      addLog('Refreshing statistics...');

      const response = await fetch('/api/test-local/stats');
      if (response.ok) {
        const newStats = await response.json();
        setStats(newStats);
        addLog('Statistics refreshed successfully');
      } else {
        addLog('Failed to refresh statistics');
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
      addLog('Error refreshing statistics');
    } finally {
      setLoading(false);
    }
  };

  const setupEnvironment = async () => {
    try {
      setLoading(true);
      addLog('Setting up test environment...');

      const response = await fetch('/api/test-local/setup', { method: 'POST' });
      if (response.ok) {
        addLog('Test environment setup completed');
        await refreshStats();
      } else {
        addLog('Failed to setup test environment');
      }
    } catch (error) {
      console.error('Error setting up environment:', error);
      addLog('Error setting up environment');
    } finally {
      setLoading(false);
    }
  };

  const seedDatabase = async () => {
    try {
      setLoading(true);
      addLog('Seeding database with mock data...');

      const response = await fetch('/api/test-local/seed', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        addLog(`Database seeded: ${result.message}`);
        await refreshStats();
      } else {
        addLog('Failed to seed database');
      }
    } catch (error) {
      console.error('Error seeding database:', error);
      addLog('Error seeding database');
    } finally {
      setLoading(false);
    }
  };

  const resetDatabase = async () => {
    if (!confirm('Are you sure you want to reset the database? This will delete all data.')) {
      return;
    }

    try {
      setLoading(true);
      addLog('Resetting database...');

      const response = await fetch('/api/test-local/reset', { method: 'POST' });
      if (response.ok) {
        addLog('Database reset and reseeded successfully');
        await refreshStats();
      } else {
        addLog('Failed to reset database');
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      addLog('Error resetting database');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (dryRun: boolean) => {
    if (!dryRun && !confirm('Run ISA-Rankings migration with EXECUTE mode? This will write data to the database.')) {
      return;
    }

    try {
      setLoading(true);
      addLog(`Running ISA-Rankings migration (${dryRun ? 'dry run' : 'execute'})...`);

      const response = await fetch('/api/test-local/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`Migration ${dryRun ? '(dry run)' : ''} complete in ${result.duration}s`);
        addLog(`  Athletes: ${result.stats.athletesProcessed}, Profiles: ${result.stats.profilesCreated}, Rankings: ${result.stats.rankingsCreated}`);
        addLog(`  Participations: ${result.stats.participationsCreated}, Events: ${result.stats.eventsCreated}, Contests: ${result.stats.contestsCreated}`);
        if (!dryRun) await refreshStats();
      } else {
        const err = await response.json().catch(() => ({}));
        addLog(`Migration failed: ${err.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error running migration:', error);
      addLog('Error running migration');
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    if (!confirm('Are you sure you want to clear test data?')) {
      return;
    }

    try {
      setLoading(true);
      addLog('Clearing test data...');

      const response = await fetch('/api/test-local/clear-test', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        addLog(`Cleared ${result.count} test items`);
        await refreshStats();
      } else {
        addLog('Failed to clear test data');
      }
    } catch (error) {
      console.error('Error clearing test data:', error);
      addLog('Error clearing test data');
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="bg-default p-6 rounded-lg shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-default p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Seed Database from JSON</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={setupEnvironment}
            disabled={loading}
            className="bg-action-primary-bg text-inverse px-4 py-2 rounded-md hover:bg-action-primary-bg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working...' : 'Setup Tables'}
          </button>
          <button
            onClick={seedDatabase}
            disabled={loading}
            className="bg-action-primary-bg text-inverse px-4 py-2 rounded-md hover:bg-action-primary-bg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working...' : 'Seed Data'}
          </button>
          <button
            onClick={resetDatabase}
            disabled={loading}
            className="bg-status-warning-bg text-inverse px-4 py-2 rounded-md hover:bg-status-warning-bg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working...' : 'Reset & Seed'}
          </button>
          <button
            onClick={clearTestData}
            disabled={loading}
            className="bg-action-danger-bg text-inverse px-4 py-2 rounded-md hover:bg-action-danger-bg-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working...' : 'Clear Test Data'}
          </button>
        </div>
        <div className="mt-4">
          <button
            onClick={refreshStats}
            disabled={loading}
            className="bg-inverse text-inverse px-4 py-2 rounded-md hover:bg-inverse disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Stats'}
          </button>
        </div>
      </div>

      {/* ISA-Rankings Migration */}
      {envReady && (
        <div className="bg-default p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">ISA-Rankings Migration</h2>
          <p className="text-sm text-default mb-4">
            Migrate data from ISA-Rankings table into SportHub schema (athletes, rankings, events, contests).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={() => runMigration(true)}
              disabled={loading}
              className="bg-category-violet-fg text-inverse px-4 py-2 rounded-md hover:bg-category-violet-fg disabled:opacity-50 transition-colors"
            >
              {loading ? 'Working...' : 'Dry Run'}
            </button>
            <button
              onClick={() => runMigration(false)}
              disabled={loading}
              className="bg-category-orange-fg text-inverse px-4 py-2 rounded-md hover:bg-category-orange-fg disabled:opacity-50 transition-colors"
            >
              {loading ? 'Working...' : 'Execute Migration'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {envReady && (
        <div className="bg-default p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/admin/user-management"
              className="block bg-category-violet-bg p-4 rounded-lg hover:bg-category-violet-bg transition-colors"
            >
              <h3 className="font-semibold">User Management</h3>
              <p className="text-sm text-default mt-1">
                List, edit and set roles of users
              </p>
            </a>
            <a
              href="/test_CSR"
              className="block bg-category-purple-bg p-4 rounded-lg hover:bg-category-purple-bg transition-colors"
            >
              <h3 className="font-semibold">Client-Side Testing</h3>
              <p className="text-sm text-default mt-1">
                Test DynamoDB operations with API routes
              </p>
            </a>
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="bg-default p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
        <div className="bg-inverse text-success p-4 rounded-lg font-mono text-sm max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-muted">No activity yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-subtle p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Environment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Configuration</h3>
            <div className="space-y-1">
              <div>DynamoDB Local: <code className="bg-default px-1 rounded">localhost:8000</code></div>
              <div>Environment: <code className="bg-default px-1 rounded">local</code></div>
              <div>Table Prefix: <code className="bg-default px-1 rounded">local-*</code></div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Current Stats</h3>
            <div className="space-y-1">
              <div>Profiles: <code className="bg-default px-1 rounded">{stats.tables['users-profiles'] || 0}</code></div>
              <div>Rankings: <code className="bg-default px-1 rounded">{stats.tables['users-rankings'] || 0}</code></div>
              <div>Participations: <code className="bg-default px-1 rounded">{stats.tables['users-participations'] || 0}</code></div>
              <div>Events: <code className="bg-default px-1 rounded">{stats.tables['events-metadata'] || 0}</code></div>
              <div>Contests: <code className="bg-default px-1 rounded">{stats.tables['events-contests'] || 0}</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}