import { Alert } from "@ui/Alert";
import { EventStatus, statusColor } from "../page";
import { COUNTRIES } from "@utils/countries";
import { formatDateRangeShort } from "@utils/dates";
import Link from "next/link";
import { Badge, Discipline } from "@ui/Badge";
import { MyEventActions } from "./MyEventsTable";

export const MyEventsList = ({ events }: {events: Record<string, unknown>[]}) => {
  if (events.length === 0) {
    return (
      <Alert variant="info">
        You haven&apos;t submitted any events yet.
      </Alert>
    );
  }

  return (
    <ul>
      {events.map((event) => {
        const eventId = String(event.eventId ?? "");
        const status = (event.status as EventStatus) ?? "published";
        const countryCode = String(event.country ?? "");
        const countryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode;
        const disciplines = (event.disciplines as string[] | undefined) ?? [];
        const contests = (event.contests as unknown[] | undefined) ?? [];
        const formattedCreatedAt = event.createdAt
          ? new Date(String(event.createdAt)).toLocaleDateString()
          : "—";
        const formattedEventName = String(event.name ?? "—");
        const formattedDateRange = formatDateRangeShort(new Date(event?.startDate as string), new Date(event.endDate as string));
        const formattedLocation = `${event.city}, ${countryName}`;

        return (
          <li className="stack gap-1 border border-neutral-300 p-2" key={eventId}>
            <div className="cluster justify-between">
              <div className="font-bold">
                {status === "published" 
                  ? (
                    <Link href={`/events/${eventId}`} className="text-blue-600 hover:underline">
                      {formattedEventName}
                    </Link>
                  ) 
                  : formattedEventName
                }
              </div>
              <div>
                <Badge color={statusColor[status]}>
                  {status}
                </Badge>
              </div>
            </div>
            <div className="cluster justify-between">
              <div>{formattedLocation}</div>
              <div>{formattedDateRange}</div>
            </div>
            <div className="cluster justify-between">
              <div>Contests: {contests.length}</div>
              <div>{disciplines.map(d => <Discipline key={d} variant={d} />)}</div>
            </div>
            <div className="cluster justify-between text-gray-400">
              <div>Created At: {formattedCreatedAt}</div>
            </div>
            <MyEventActions eventId={eventId} status={status} />
          </li>
        );
      })}
    </ul>
  );
};
