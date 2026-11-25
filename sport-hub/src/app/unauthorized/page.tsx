import { rolesLabel } from 'src/types/rbac';
import { auth } from "@lib/auth"
import Link from "next/link"
import PageLayout from "@ui/PageLayout"

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>
}) {
  const session = await auth()
  const requiredRole = (await searchParams).required

  return (
    <PageLayout
      title=""
      description=""
    >
      <div>
        <div className="max-w-2xl mx-auto bg-default shadow rounded-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-24 w-24 text-danger"
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

          <h1 className="text-3xl font-bold text-default mb-4">
            Access Denied
          </h1>

          <p className="text-default mb-6">
            You don&apos;t have the required permissions to access this page.
          </p>

          {requiredRole && (
            <p className="text-sm text-muted mb-6">
              Required role: <code className="bg-muted px-2 py-1 rounded">{requiredRole}</code>
            </p>
          )}

          {session && (
            <div className="bg-status-info-bg border border-default rounded-lg p-4 mb-6">
              <p className="text-sm text-link">
                You are currently signed in as: <strong>{session.user.email}</strong>
              </p>
              <p className="text-sm text-link">
                Role: <code className="bg-status-info-bg px-2 py-1 rounded">{rolesLabel(session.user.roles)}</code>
              </p>
            </div>
          )}

          <div className="space-x-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-inverse bg-action-primary-bg hover:bg-action-primary-bg-hover"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 border border-default text-base font-medium rounded-md text-default bg-default hover:bg-subtle"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
