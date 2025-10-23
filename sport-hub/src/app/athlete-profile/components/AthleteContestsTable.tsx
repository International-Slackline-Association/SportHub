import { createColumnHelper } from '@tanstack/react-table';
import { AthleteContest } from '@lib/data-services';
import Table from '@ui/Table';
import Link from 'next/link';

const columnHelper = createColumnHelper<AthleteContest>();
const columns = [
  columnHelper.accessor("rank", {
    header: "Rank",
  }),
  columnHelper.accessor("eventName", {
    enableColumnFilter: true,
    header: "Event",
    meta: {
      filterVariant: "text",
    },
    filterFn: "includesString",
    cell: (info) => (
      <Link href={`/events/${info.row.original.eventId}`} className="text-blue-600 hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("contest", {
    enableColumnFilter: true,
    header: "Contest",
    meta: {
      filterVariant: "text",
    },
    filterFn: "includesString",
  }),
  columnHelper.accessor("discipline", {
    enableColumnFilter: true,
    header: "Discipline",
    meta: {
      filterVariant: "select",
    },
  }),
  columnHelper.accessor("points", {
    header: "Points",
  }),
  columnHelper.accessor("contestSize", {
    enableColumnFilter: true,
    header: "Contest Size",
    meta: {
      filterVariant: "select",
    },
  }),
  columnHelper.accessor("dates", {
    header: "Dates",
  }),
];

type AthleteContestsTableProps = {
  contests: AthleteContest[];
};

const AthleteContestsTable = ({ contests }: AthleteContestsTableProps) => {
  return (
    <div className="mb-8">
      <h3>Contests</h3>
      <Table options={{ columns, data: contests }} />
    </div>
  );
};

export default AthleteContestsTable;
