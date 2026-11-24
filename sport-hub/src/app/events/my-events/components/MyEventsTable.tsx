import Link from "next/link";
import { submitEventForApproval, withdrawEventFromApproval } from "../../submit/actions";
import { COUNTRIES } from "@utils/countries";
import { formatDate, formatDateRangeShort } from "@utils/dates";
import { Badge, Button, EmptyState, Table, type BadgeCategoryColor, type BadgeStatusColor } from '@slacklineinternational/onsight/react';
import { Discipline } from "@ui/Badge";
import { EventStatus } from "../page";

export const statusColor: Record<EventStatus, BadgeCategoryColor | BadgeStatusColor> = {
  draft: "neutral",
  pending: "warning",
  published: "success",
  cancelled: "danger",
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
          as={Link}
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
            variant="danger-secondary"
          >
            Withdraw
          </Button>
        </form>
        <Button
          as={Link}
          href={`/events/my-events/${eventId}/edit`}
          size="small"
        >
          Edit
        </Button>
      </>
    )}
    {status === "published" && (
      <Button
        as={Link}
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
      <EmptyState title="No events yet">
        Events you submit show up here.
      </EmptyState>
    );
  }
  return (
    <Table
      aria-label="My events"
      stickyFirst
      rowKey={(event) => String(event.eventId ?? "")}
      rows={events}
      columns={[
        {
          key: "event",
          header: "Event",
          rowHeader: true,
          render: (event) => {
            const eventId = String(event.eventId ?? "");
            const status = (event.status as EventStatus) ?? "published";
            const name = String(event.eventName ?? "—");
            return status === "published"
              ? <Link href={`/events/${eventId}`} className="underline">{name}</Link>
              : name;
          },
        },
        {
          key: "dates",
          header: "Dates",
          render: (event) => formatDateRangeShort(new Date(event.startDate as string), new Date(event.endDate as string)),
        },
        {
          key: "location",
          header: "Location",
          render: (event) => {
            const countryCode = String(event.country ?? "");
            const countryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode;
            return `${event.city}, ${countryName}`;
          },
        },
        {
          key: "disciplines",
          header: "Disciplines",
          render: (event) => {
            const disciplines = (event.disciplines as string[] | undefined) ?? [];
            return <span className="space-x-1">{disciplines.map(d => <Discipline key={d} variant={d} />)}</span>;
          },
        },
        {
          key: "contests",
          header: "Contests",
          render: (event) => ((event.contests as unknown[] | undefined) ?? []).length,
        },
        {
          key: "status",
          header: "Status",
          render: (event) => {
            const status = (event.status as EventStatus) ?? "published";
            return <Badge color={statusColor[status]}>{status}</Badge>;
          },
        },
        {
          key: "submitted",
          header: "Submitted",
          render: (event) => event.createdAt ? formatDate(new Date(Number(event.createdAt)).toISOString()) : "—",
        },
        {
          key: "actions",
          header: "Actions",
          render: (event) => (
            <MyEventActions eventId={String(event.eventId ?? "")} status={(event.status as EventStatus) ?? "published"} />
          ),
        },
      ]}
    />
  );
}
