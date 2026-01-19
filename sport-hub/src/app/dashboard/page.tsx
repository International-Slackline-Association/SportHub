import { auth } from "@lib/auth"
import { redirect } from "next/navigation"
import PageLayout from "@ui/PageLayout"
import ProfileSection from "./components/ProfileSection"
import { getUserProfile } from "./actions"
import { getReferenceUserById } from "@lib/reference-db-service"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Fetch full user profile from database (contains role, stats)
  const profileResult = await getUserProfile(session.user.id);

  // Fetch identity data from reference DB (name, email, country)
  const referenceUser = await getReferenceUserById(session.user.id);

  // Fallback to session data if user not in reference DB yet
  const displayName = referenceUser?.name || session.user.name || '';
  const displayEmail = referenceUser?.email || session.user.email || '';
  const displayCountry = referenceUser?.country;

  return (
    <PageLayout
      title="Dashboard"
      description="Manage your profile and view your information"
    >
      <div className="p-4 sm:p-0 space-y-6">
        {/* Info message if user not in database */}
        {!profileResult.success && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="font-medium">Complete your profile</p>
            <p className="text-sm">Click &ldquo;Edit Profile&rdquo; below to save your information to the database.</p>
          </div>
        )}

        {/* Welcome Message */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {displayName}!</h2>
          <p className="text-gray-600">
            Manage your profile and access your personal information.
          </p>
        </div>

        {/* Profile Section with Edit Button */}
        <ProfileSection
          userId={session.user.id}
          name={displayName}
          email={displayEmail}
          country={displayCountry}
          role={session.user.role}
        />

        {/* Session Debug Info (Optional) */}
        <div className="bg-white shadow rounded-lg p-6">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
              View Session Details
            </summary>
            <div className="mt-4 bg-gray-50 rounded p-4">
              <p className="text-sm text-gray-600 mb-2">
                You are authenticated with AWS Cognito via OIDC.
              </p>
              <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded overflow-auto text-xs">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </div>
    </PageLayout>
  )
}
