import { auth } from "@lib/auth"
import { redirect } from "next/navigation"
import PageLayout from "@ui/PageLayout"
import ProfileSection from "./components/ProfileSection"
import { getUserProfile, getFullUserProfile } from "./actions"
import { getReferenceUserById } from "@lib/reference-db-service"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Fetch full user profile from SportHub DB (contains role, stats, name, surname, email)
  const profileResult = await getUserProfile(session.user.id);
  const dbProfile = await getFullUserProfile(session.user.id);

  // Fetch identity data from reference DB (fallback for name, email, country)
  const referenceUser = await getReferenceUserById(session.user.id);

  // Priority: SportHub DB -> reference DB -> session data
  // TODO: If SportHub DB name/email differs from reference DB, we currently prefer SportHub DB.
  //       A sync mechanism should be implemented to keep both in sync on edits.
  const firstName = dbProfile?.name || referenceUser?.name || session.user.name || '';
  const surname = dbProfile?.surname || referenceUser?.surname || '';
  const displayName = `${firstName} ${surname}`.trim();
  const displayEmail = dbProfile?.email || referenceUser?.email || session.user.email || '';
  const displayCountry = dbProfile?.country || referenceUser?.country;
  const displayGender = dbProfile?.gender || referenceUser?.gender;
  const displayCity = dbProfile?.city || '';
  const displayBirthdate = dbProfile?.birthdate || '';
  const isaUsersId = dbProfile?.isaUsersId;
  const displaySocialMedia = dbProfile?.socialMedia;

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
          isaUsersId={isaUsersId}
          name={firstName}
          surname={surname}
          email={displayEmail}
          country={displayCountry}
          city={displayCity}
          birthdate={displayBirthdate}
          gender={displayGender}
          socialMedia={displaySocialMedia}
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
