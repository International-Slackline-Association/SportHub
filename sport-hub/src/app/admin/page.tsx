import { requirePermission } from "@lib/authorization"
import { auth } from "@lib/auth"
import { ROLE_LABELS, roleHasPermission, type Permission } from "src/types/rbac"
import PageLayout from "@ui/PageLayout"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: 'SportHub - Admin',
}

export default async function AdminPage() {
  // Any admin role may open the dashboard; each card shows only to roles that can use it
  await requirePermission('admin:access');
  const session = await auth();
  const role = session?.user?.role;
  const can = (permission: Permission) => roleHasPermission(role, permission);

  return (
    <PageLayout
      title="Admin Dashboard"
      description={`Signed in as ${role ? ROLE_LABELS[role] : "admin"}. You see the tools your role can use.`}
    >
      <div className="p-4 sm:p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {can('events:create') && (
            <Link
              href="/events/submit"
              className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Submit Event</h3>
              <p className="text-sm text-blue-700">
                Create and publish new events, contests, or competitions
              </p>
            </Link>
          )}

          {can('events:edit') && (
            <Link
              href="/admin/event-approval"
              className="block p-6 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Event Approval</h3>
              <p className="text-sm text-amber-700">
                Review and approve events submitted by organizers
              </p>
            </Link>
          )}

          {can('events:edit') && (
            <Link
              href="/admin/score-review"
              className="block p-6 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Score Review</h3>
              <p className="text-sm text-amber-700">
                Review edits to already-published results before they go live
              </p>
            </Link>
          )}

          {can('records:review') && (
            <Link
              href="/admin/records-review"
              className="block p-6 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Records and Firsts</h3>
              <p className="text-sm text-amber-700">
                Review claims, manage record categories and resolve the sheet import
              </p>
            </Link>
          )}

          {can('users:manage') && (
            <Link
              href="/admin/duplicate-accounts"
              className="block p-6 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <h3 className="text-lg font-semibold text-red-900 mb-2">Duplicate Accounts</h3>
              <p className="text-sm text-red-700">
                Merge split contest results from a secondary account into the main profile
              </p>
            </Link>
          )}

          {can('users:manage') && (
            <Link
              href="/test_SSR"
              className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <h3 className="text-lg font-semibold text-green-900 mb-2">Manage Users</h3>
              <p className="text-sm text-green-700">
                View and manage user accounts
              </p>
            </Link>
          )}

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
