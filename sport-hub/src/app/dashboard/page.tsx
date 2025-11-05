import { auth } from "@lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import PageLayout from "@ui/PageLayout"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <PageLayout
      title="Dashboard"
      description="Protected dashboard for authenticated users"
    >
      <div className="p-4 sm:p-0 space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Welcome, {session.user.name}!</h2>

          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-2">User Information</h3>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{session.user.name || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{session.user.email || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="text-sm text-gray-900 font-mono">{session.user.id}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Session Details</h3>
              <div className="bg-gray-50 rounded p-4">
                <p className="text-sm text-gray-600 mb-2">
                  You are successfully authenticated with AWS Cognito via OIDC.
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    View session data
                  </summary>
                  <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded overflow-auto">
                    {JSON.stringify(session, null, 2)}
                  </pre>
                </details>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
              <div className="flex gap-3">
                <Link
                  href="/rankings"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  View Rankings
                </Link>
                <Link
                  href="/events"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Browse Events
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
