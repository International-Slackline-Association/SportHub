import { Metadata } from "next";
import Link from "next/link";
import PageLayout from "@ui/PageLayout";
import { getPendingEvents, updateEventStatus, createPendingUserFromEvent } from "../../events/submit/actions";
import { COUNTRIES } from "@utils/countries";
import { PendingUserData } from "../../events/submit/types";

export const metadata: Metadata = {
  title: "SportHub - Event Approval",
};

type PendingEntry = {
  contestIdx: number;
  contestLabel: string;
  entryType: 'judge' | 'athlete';
  entryIdx: number;
  pendingUser: PendingUserData;
};

function collectPendingUsers(event: Record<string, unknown>): PendingEntry[] {
  const contests = (event.contests as Record<string, unknown>[] | undefined) ?? [];
  const entries: PendingEntry[] = [];
  contests.forEach((contest, contestIdx) => {
    const label = `Contest ${contestIdx + 1}`;
    const judges = (contest.judges as Record<string, unknown>[] | undefined) ?? [];
    const results = (contest.results as Record<string, unknown>[] | undefined) ?? [];
    judges.forEach((j, jIdx) => {
      if (j.pendingUser) entries.push({ contestIdx, contestLabel: label, entryType: 'judge', entryIdx: jIdx, pendingUser: j.pendingUser as PendingUserData });
    });
    results.forEach((r, rIdx) => {
      if (r.pendingUser) entries.push({ contestIdx, contestLabel: label, entryType: 'athlete', entryIdx: rIdx, pendingUser: r.pendingUser as PendingUserData });
    });
  });
  return entries;
}

export default async function EventApprovalPage() {
  const result = await getPendingEvents();
  const events = (result.events ?? []) as Record<string, unknown>[];

  return (
    <PageLayout
      title="Event Approval"
      description="Review and approve events submitted by organizers."
    >
      <section className="p-4 sm:p-0">
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No events pending approval.
          </div>
        ) : (
          <div className="stack gap-6">
            {events.map((event) => {
              const eventId = String(event.eventId ?? "");
              const countryCode = String(event.country ?? "");
              const countryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode;
              const contests = (event.contests as unknown[] | undefined) ?? [];
              const submittedAt = event.submittedForApprovalAt ?? event.createdAt;
              const submittedDate = submittedAt
                ? new Date(String(submittedAt)).toLocaleDateString()
                : "—";
              const dates = [event.startDate, event.endDate].filter(Boolean).join(" – ") || "—";
              const pendingUsers = collectPendingUsers(event);
              const hasPendingUsers = pendingUsers.length > 0;

              return (
                <div key={eventId} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Event header row */}
                  <div className="flex flex-wrap gap-4 items-start justify-between p-4 bg-white">
                    <div className="stack gap-1">
                      <Link href={`/events/${eventId}`} className="font-semibold text-blue-700 hover:underline">
                        {String(event.name ?? "—")}
                      </Link>
                      <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                        <span>
                          By{" "}
                          {event.createdBy ? (
                            <Link
                              href={`/athlete-profile/${event.createdBy}`}
                              className="text-blue-600 hover:underline"
                            >
                              {String(event.createdByName ?? event.createdBy)}
                            </Link>
                          ) : "—"}
                          {event.createdBy && (
                            <span className="ml-1 text-gray-400">({String(event.createdBy)})</span>
                          )}
                        </span>
                        <span>{dates}</span>
                        <span>{[event.city, countryName].filter(Boolean).join(", ") || "—"}</span>
                        <span>{contests.length} contest{contests.length !== 1 ? "s" : ""}</span>
                        <span>Submitted {submittedDate}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      {hasPendingUsers && (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded font-medium">
                          ⚠ {pendingUsers.length} new user{pendingUsers.length !== 1 ? "s" : ""} to create
                        </span>
                      )}
                      <Link
                        href={`/events/${eventId}`}
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/events/my-events/${encodeURIComponent(eventId)}/edit`}
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Edit Event Details
                      </Link>
                      <form action={async () => {
                        "use server";
                        await updateEventStatus(eventId, "published");
                      }}>
                        <button
                          type="submit"
                          disabled={hasPendingUsers}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title={hasPendingUsers ? "Create all new users before approving" : undefined}
                        >
                          Approve
                        </button>
                      </form>
                      <form action={async () => {
                        "use server";
                        await updateEventStatus(eventId, "draft");
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

                  {/* Pending users sub-section */}
                  {hasPendingUsers && (
                    <div className="border-t border-amber-100 bg-amber-50 p-4 stack gap-3">
                      <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                        New Users — must be created before approving
                      </h4>
                      <div className="stack gap-2">
                        {pendingUsers.map((entry, i) => {
                          const createAction = createPendingUserFromEvent.bind(
                            null,
                            eventId,
                            entry.contestIdx,
                            entry.entryType,
                            entry.entryIdx,
                          );
                          return (
                            <div key={i} className="flex flex-wrap items-center gap-3 bg-white border border-amber-200 rounded px-3 py-2 text-sm">
                              <div className="stack gap-0.5 flex-1 min-w-0">
                                <span className="font-medium">
                                  {entry.pendingUser.name} {entry.pendingUser.surname}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {entry.pendingUser.email}
                                  {entry.pendingUser.gender && ` · ${entry.pendingUser.gender}`}
                                  {entry.pendingUser.country && ` · ${entry.pendingUser.country}`}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400 capitalize shrink-0">
                                {entry.contestLabel} · {entry.entryType}
                              </span>
                              <form action={createAction}>
                                <button
                                  type="submit"
                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0 cursor-pointer"
                                >
                                  Create User
                                </button>
                              </form>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageLayout>
  );
}
