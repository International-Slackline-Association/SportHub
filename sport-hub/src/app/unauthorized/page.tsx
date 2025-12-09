import { auth } from "@lib/auth"
import Link from "next/link"
import PageLayout from "@ui/PageLayout"

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: { required?: string }
}) {
  const session = await auth()
  const requiredRole = searchParams.required

  return (
    <PageLayout
      title="Access Denied"
      description="You don't have permission to access this resource"
    >
      <div className="p-4 sm:p-0">
        <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-24 w-24 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>

          <p className="text-gray-600 mb-6">
            You don&apos;t have the required permissions to access this page.
          </p>

          {requiredRole && (
            <p className="text-sm text-gray-500 mb-6">
              Required role: <code className="bg-gray-100 px-2 py-1 rounded">{requiredRole}</code>
            </p>
          )}

          {session && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                You are currently signed in as: <strong>{session.user.name}</strong>
              </p>
              <p className="text-sm text-blue-600">
                Role: <code className="bg-blue-100 px-2 py-1 rounded">{session.user.role}</code>
              </p>
            </div>
          )}

          <div className="space-x-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
