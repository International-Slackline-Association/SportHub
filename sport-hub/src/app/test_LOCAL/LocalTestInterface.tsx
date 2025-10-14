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
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Database Operations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={setupEnvironment}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working...' : 'Setup Tables'}
          </button>
          <button
            onClick={seedDatabase}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working...' : 'Seed Data'}
          </button>
          <button
            onClick={resetDatabase}
            disabled={loading}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working...' : 'Reset & Seed'}
          </button>
          <button
            onClick={clearTestData}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working...' : 'Clear Test Data'}
          </button>
        </div>
        <div className="mt-4">
          <button
            onClick={refreshStats}
            disabled={loading}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Stats'}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      {envReady && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/test_SSR"
              className="block bg-indigo-100 p-4 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              <h3 className="font-semibold">Server-Side Testing</h3>
              <p className="text-sm text-gray-600 mt-1">
                Test DynamoDB operations with server actions
              </p>
            </a>
            <a
              href="/test_CSR"
              className="block bg-purple-100 p-4 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <h3 className="font-semibold">Client-Side Testing</h3>
              <p className="text-sm text-gray-600 mt-1">
                Test DynamoDB operations with API routes
              </p>
            </a>
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No activity yet...</div>
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
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Environment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Configuration</h3>
            <div className="space-y-1">
              <div>DynamoDB Local: <code className="bg-white px-1 rounded">localhost:8000</code></div>
              <div>Environment: <code className="bg-white px-1 rounded">local</code></div>
              <div>Table Prefix: <code className="bg-white px-1 rounded">local-*</code></div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Current Stats</h3>
            <div className="space-y-1">
              <div>Users: <code className="bg-white px-1 rounded">{stats.tables.rankings || 0}</code></div>
              <div>Contests: <code className="bg-white px-1 rounded">{stats.tables.contests || 0}</code></div>
              <div>Athletes: <code className="bg-white px-1 rounded">{stats.tables.athletes || 0}</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}