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
  console.log("Hello admin, this is a test. Please ignore and remove me later.");
  return (
    <PageLayout
      title="Admin Dashboard"
      description="Welcome to the admin panel. You have full access to manage the platform."
    >
      <div className="p-4 sm:p-0">
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

          <Link
            href="/admin/event-approval"
            className="block p-6 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Event Approval</h3>
            <p className="text-sm text-amber-700">
              Review and approve events submitted by organizers
            </p>
          </Link>

          <Link
            href="/test_SSR"
            className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <h3 className="text-lg font-semibold text-green-900 mb-2">Manage Users</h3>
            <p className="text-sm text-green-700">
              View and manage user accounts
            </p>
          </Link>

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
    </PageLayout>
  )
}
