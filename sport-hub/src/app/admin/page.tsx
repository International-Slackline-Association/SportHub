import { requireAdmin } from "@lib/authorization"
import PageLayout from "@ui/PageLayout"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: 'SportHub - Admin',
}

export default async function AdminPage() {
  // Require admin role (redirects if unauthorized)
  await requireAdmin();

  return (
    <PageLayout
      title="Admin"
      description="Modify data"
    >
      <div className="p-4 sm:p-0">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
          <p className="text-gray-600 mb-6">
            Welcome to the admin panel. You have full access to manage the platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/events/submit"
              className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Submit Event</h3>
              <p className="text-sm text-blue-700">
                Create and publish new events, contests, or competitions
              </p>
            </Link>

            <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg opacity-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
              <p className="text-sm text-gray-700">
                View and manage user accounts (Coming soon)
              </p>
            </div>

            <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg opacity-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports</h3>
              <p className="text-sm text-gray-700">
                View analytics and reports (Coming soon)
              </p>
            </div>

            <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg opacity-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
              <p className="text-sm text-gray-700">
                Configure platform settings (Coming soon)
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
