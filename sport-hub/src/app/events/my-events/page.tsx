import { Metadata } from "next";
import Link from "next/link";
import PageLayout from "@ui/PageLayout";
import { getMyEvents, submitEventForApproval, withdrawEventFromApproval } from "../submit/actions";
import { snakeCaseToTitleCase } from "@utils/strings";
import { COUNTRIES } from "@utils/countries";
import { disciplineOptions } from "@ui/Form/commonOptions";
import { Option } from "@ui/Form";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "SportHub - My Events",
};

type EventStatus = 'draft' | 'pending' | 'published' | 'cancelled';

const labelOf = (opts: Option[], val: string) =>
  opts.find(o => o.value === val)?.label ?? snakeCaseToTitleCase(val);

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  published: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.published;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}

export default async function MyEventsPage() {
  const result = await getMyEvents();
  const events = (result.events ?? []) as Record<string, unknown>[];

  return (
    <PageLayout
      title="My Events"
      description="Events you have submitted. Submit drafts for admin approval when ready."
    >
      <section className="p-4 sm:p-0">
        <div className="flex justify-end mb-4">
          <Link
            href="/events/submit"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Submit Event
          </Link>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>You haven&apos;t submitted any events yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-3 pr-4 font-medium">Event</th>
                  <th className="py-3 pr-4 font-medium">Dates</th>
                  <th className="py-3 pr-4 font-medium">Location</th>
                  <th className="py-3 pr-4 font-medium">Disciplines</th>
                  <th className="py-3 pr-4 font-medium">Contests</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Submitted</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const eventId = String(event.eventId ?? "");
                  const status = (event.status as EventStatus) ?? "published";
                  const countryCode = String(event.country ?? "");
                  const countryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode;
                  const disciplines = (event.disciplines as string[] | undefined) ?? [];
                  const contests = (event.contests as unknown[] | undefined) ?? [];
                  const createdAt = event.createdAt
                    ? new Date(String(event.createdAt)).toLocaleDateString()
                    : "—";
                  const dates = [event.startDate, event.endDate].filter(Boolean).join(" – ") || "—";

                  return (
                    <tr key={eventId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">
                        {status === "published" ? (
                          <Link href={`/events/${eventId}`} className="text-blue-600 hover:underline">
                            {String(event.name ?? "—")}
                          </Link>
                        ) : (
                          String(event.name ?? "—")
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{dates}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {[event.city, countryName].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {disciplines.length
                          ? disciplines.map(d => labelOf(disciplineOptions, d)).join(", ")
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 text-center">{contests.length}</td>
                      <td className="py-3 pr-4"><StatusPill status={status} /></td>
                      <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{createdAt}</td>
                      <td className="py-3">
                        <div className="flex gap-2 flex-wrap">
                          {status === "draft" && (
                            <>
                              <form action={async () => {
                                "use server";
                                await submitEventForApproval(eventId);
                              }}>
                                <button
                                  type="submit"
                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                                >
                                  Submit for Approval
                                </button>
                              </form>
                              <Link
                                href={`/events/my-events/${eventId}/edit`}
                                className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Edit
                              </Link>
                            </>
                          )}
                          {status === "pending" && (
                            <>
                              <form action={async () => {
                                "use server";
                                await withdrawEventFromApproval(eventId);
                              }}>
                                <button
                                  type="submit"
                                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
                                >
                                  Withdraw
                                </button>
                              </form>
                              <Link
                                href={`/events/my-events/${eventId}/edit`}
                                className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Edit
                              </Link>
                            </>
                          )}
                          {status === "published" && (
                            <Link
                              href={`/events/my-events/${eventId}/edit-scores`}
                              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Edit Judges &amp; Scores
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
