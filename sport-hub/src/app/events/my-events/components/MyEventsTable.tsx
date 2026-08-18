import Link from "next/link";
import { submitEventForApproval, withdrawEventFromApproval } from "../../submit/actions";
import { COUNTRIES } from "@utils/countries";
import tableStyles from '@ui/Table/styles.module.css';
import { formatDate, formatDateRangeShort } from "@utils/dates";
import Button from "@ui/Button";
import { Badge, BadgeColor, Discipline } from "@ui/Badge";
import { EventStatus } from "../page";
import { Alert } from "@ui/Alert";

export const statusColor: Record<EventStatus, BadgeColor> = {
  draft: "NEUTRAL",
  pending: "ORANGE",
  published: "GREEN",
  cancelled: "RED",
};

export const MyEventActions = ({ eventId, status }: { eventId: string, status: EventStatus }) => (
  <div className="flex gap-2 flex-wrap">
    {status === "draft" && (
      <>
        <form action={async () => {
          "use server";
          await submitEventForApproval(eventId);
        }}>
          <Button
            size="small"
            type="submit"
            variant="secondary"
          >
            Submit for Approval
          </Button>
        </form>
        <Button
          as="link"
          href={`/events/my-events/${eventId}/edit`}
          size="small"
          variant="secondary"
        >
          Edit
        </Button>
      </>
    )}
    {status === "pending" && (
      <>
        <form action={async () => {
          "use server";
          await withdrawEventFromApproval(eventId);
        }}>
          <Button
            size="small"
            type="submit"
            variant="destructive-secondary"
          >
            Withdraw
          </Button>
        </form>
        <Button
          as="link"
          href={`/events/my-events/${eventId}/edit`}
          size="small"
        >
          Edit
        </Button>
      </>
    )}
    {status === "published" && (
      <Button
        as="link"
        href={`/events/my-events/${eventId}/edit-scores`}
        size="small"
        variant="secondary"
      >
        Edit Judges &amp; Scores
      </Button>
    )}
  </div>
);

export const MyEventsTable = ({ events }: {events: Record<string, unknown>[]}) => {
  if (events.length === 0) {
    return (
      <Alert variant="info">
        You haven&apos;t submitted any events yet.
      </Alert>
    );
  }
  return (
    <div className={tableStyles.tableContainer}>
      <div className={tableStyles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Dates</th>
              <th>Location</th>
              <th>Disciplines</th>
              <th className="w-[80px]">Contests</th>
              <th className="w-[80px]">Status</th>
              <th className="w-[100px]">Submitted</th>
              <th>Actions</th>
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
              const formattedCreatedAt = event.createdAt
                ? formatDate(new Date(Number(event.createdAt)).toISOString())
                : "—";
              const formattedEventName = String(event.eventName ?? "—");
              const formattedDateRange = formatDateRangeShort(new Date(event?.startDate as string), new Date(event.endDate as string));
              const formattedLocation = `${event.city}, ${countryName}`;

              return (
                <tr key={eventId}>
                  <td>
                    {status === "published" 
                      ? (
                        <Link href={`/events/${eventId}`} className="text-blue-600 hover:underline">
                          {formattedEventName}
                        </Link>
                      ) 
                      : formattedEventName
                    }
                  </td>
                  <td>{formattedDateRange}</td>
                  <td>{formattedLocation}</td>
                  <td>{disciplines.map(d => <Discipline key={d} variant={d} />)}</td>
                  <td>{contests.length}</td>
                  <td>
                    <Badge color={statusColor[status]}>
                      {status}
                    </Badge>
                  </td>
                  <td>{formattedCreatedAt}</td>
                  <td>
                    <MyEventActions eventId={eventId} status={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
