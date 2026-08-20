import { Metadata } from "next";
import Link from "next/link";
import PageLayout from "@ui/PageLayout";
import { getPendingOrganizerClaims, approveOrganizerClaim, rejectOrganizerClaim } from "../../events/submit/organizer-claims-actions";
import { COUNTRIES } from "@utils/countries";

export const metadata: Metadata = {
  title: "SportHub - Organizer Claims",
};

export default async function OrganizerClaimsPage() {
  const result = await getPendingOrganizerClaims();
  const claims = result.claims ?? [];

  return (
    <PageLayout
      title="Organizer Claims"
      description="Review requests from users claiming organizer credit for events with no associated organizer."
    >
      <section className="p-4 sm:p-0">
        {claims.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No pending organizer claims.
          </div>
        ) : (
          <div className="stack gap-4">
            {claims.map((claim) => {
              const countryName = claim.country
                ? COUNTRIES.find(c => c.code === claim.country)?.name ?? claim.country
                : null;
              const requestedDate = new Date(claim.requestedAt).toLocaleDateString();
              const eventId = claim.eventId;
              const userId = claim.userId;

              return (
                <div
                  key={`${claim.eventId}#${claim.userId}`}
                  className="flex flex-wrap gap-4 items-center justify-between p-4 border border-gray-200 rounded-lg bg-white"
                >
                  <div className="stack gap-1">
                    <Link
                      href={`/events/${encodeURIComponent(claim.eventId)}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      {claim.eventName}
                    </Link>
                    <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                      <span>
                        Claimed by{" "}
                        <Link
                          href={`/athlete/${encodeURIComponent(claim.userId)}`}
                          className="text-blue-600 hover:underline"
                        >
                          {claim.userName}
                        </Link>
                      </span>
                      <span>{claim.startDate}</span>
                      <span>{[claim.city, countryName].filter(Boolean).join(", ") || "—"}</span>
                      <span>Requested {requestedDate}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <form action={async () => {
                      "use server";
                      await approveOrganizerClaim(eventId, userId);
                    }}>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={async () => {
                      "use server";
                      await rejectOrganizerClaim(eventId, userId);
                    }}>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageLayout>
  );
}
