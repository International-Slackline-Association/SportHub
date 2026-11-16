import { auth } from "@lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import PageLayout from "@ui/PageLayout"
import { Alert, Button } from '@slacklineinternational/onsight/react';
import { GridSection } from "../components/GridSection"
import ProfileSection from "./components/ProfileSection"
import { getUserProfile, getFullUserProfile, becomeOrganizer } from "./actions"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Fetch full user profile from SportHub DB (contains role, stats, name, surname, email)
  const profileResult = await getUserProfile(session.user.id);
  const dbProfile = await getFullUserProfile(session.user.id);

  // Priority: SportHub DB -> session data (reference DB removed — identity is in sporthub-users Profile)
  const firstName = dbProfile?.name || session.user.name || '';
  const surname = dbProfile?.surname || '';
  const displayName = `${firstName} ${surname}`.trim();
  const displayEmail = dbProfile?.email || session.user.email || '';
  const displayCountry = dbProfile?.country;
  const displayGender = dbProfile?.gender;
  const displayCity = dbProfile?.city || '';
  const displayBirthdate = dbProfile?.birthdate || '';
  const isaUsersId = dbProfile?.isaUsersId;
  const displayLinks = dbProfile?.links;

  const isOrganizer = profileResult.success && profileResult.user?.userSubTypes?.includes('organizer');

  return (
    <PageLayout
      title={`Welcome back, ${displayName}!`}
      description="Manage your profile and access your personal information."
    >
      {/* Info message if user not in database */}
      <div className="p-4 sm:p-0 stack gap-4">
        {!profileResult.success && (
          <Alert variant="info">
            <p className="font-medium">Complete your profile</p>
            <p className="text-sm">Click &ldquo;Edit Profile&rdquo; below to save your information to the database.</p>
          </Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GridSection
            color="blue"
            title="View athlete profile"
            content={
              <>
                View your athlete profile as displayed to the public.
                <div className="flex mt-2">
                  <Button
                    as={Link}
                    className="mt-2"
                    href={`/athlete/${encodeURIComponent(session.user.id)}`}
                    variant="neutral"
                  >
                    Go to profile
                  </Button>
                </div>
              </>
            }
          />

          <GridSection
            color="amber"
            title="Records & Firsts"
            content={
              <>
                View the status of your pending personal records and firsts.
                <div className="flex flex-row gap-2 mt-2">
                  <Button as={Link} href="/world_records/my-claims" variant="neutral" size="small">My Claims</Button>
                  <Button as={Link} href="/world_records/claim" variant="neutral" size="small">Submit a claim</Button>
                </div>
              </>
            }
          />

            <GridSection
              color="green"
              content={
                <>
                  {isOrganizer 
                    ? 'You are an event organizer. Manage the competitions you submit.'
                    : 'You are not an event organizer. Become one to submit and manage competitions on SportHub.'
                  }
                  <div className="flex mt-2">
                    {isOrganizer ? (
                      <Button
                        as={Link}
                        href="/events/my-events"
                        variant="neutral"
                      >
                        View my events
                      </Button>
                    ) : (
                      <form action={becomeOrganizer}>
                        <Button type="submit" variant="primary" size="small">
                          Become an organizer
                        </Button>
                      </form>
                    )}
                  </div>
                </>
              }
              title={isOrganizer ? "Manage my events" : "Want to host events?"}
            />

          <GridSection
            color="red"
            title="Personal Information"
            content={
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
                links={displayLinks}
                roles={session.user.roles}
              />
            }
          />

          <GridSection
            color="gray"
            title="Session details"
            content={
              <details>
                <summary className="cursor-pointer font-medium">View session JSON</summary>
                <p className="mt-4 mb-2">You are authenticated with AWS Cognito via OIDC.</p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded overflow-auto text-xs">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </details>
            }
          />
        </div>
      </div>
    </PageLayout>
  )
}
