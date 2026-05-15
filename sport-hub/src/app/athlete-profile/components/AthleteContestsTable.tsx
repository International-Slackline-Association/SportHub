import { createColumnHelper } from '@tanstack/react-table';
import { AthleteContest } from '@lib/data-services';
import Table from '@ui/Table';
import Link from 'next/link';
import { dateFilterFn } from '@ui/Table/TableFilterFields';
import { DISCIPLINE_DATA } from '@utils/consts';
import { contestSizeOptions, eventGenderOptions, ageCategoryOptions } from '@ui/Form/commonOptions';

const labelOf = (opts: { value: string; label: string }[], val: string | undefined) =>
  opts.find(o => o.value === val)?.label ?? val ?? '';

const disciplineLabel = (val: string | undefined): string => {
  if (!val) return '';
  const byKey = DISCIPLINE_DATA[val as keyof typeof DISCIPLINE_DATA];
  if (byKey) return byKey.name;
  return Object.values(DISCIPLINE_DATA).find(e => e.enumValue === Number(val))?.name ?? val;
};

const contestLabel = (row: AthleteContest): string =>
  [
    disciplineLabel(row.discipline),
    labelOf(eventGenderOptions, row.gender),
    labelOf(ageCategoryOptions, row.ageCategory),
  ].filter(Boolean).join('-') || row.contest || 'Contest';

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
  columnHelper.accessor((row) => contestLabel(row), {
    id: "contestLabel",
    header: "Contest",
    cell: (info) => {
      const row = info.row.original;
      return (
        <Link
          href={`/events/${row.eventId}?contest=${row.contestId}`}
          className="text-blue-600 hover:underline"
        >
          {info.getValue()}
        </Link>
      );
    },
  }),
  columnHelper.accessor((row: AthleteContest) => {
    const d = String(row.discipline);
    const byKey = DISCIPLINE_DATA[d as keyof typeof DISCIPLINE_DATA];
    if (byKey) return byKey.name;
    return Object.values(DISCIPLINE_DATA).find(e => e.enumValue === Number(d))?.name ?? d;
  }, {
    id: "discipline",
    enableColumnFilter: true,
    header: "Discipline",
    meta: { filterVariant: 'select' },
    cell: info => {
      const disciplineName = info.getValue();
      const data = Object.values(DISCIPLINE_DATA).find(d => d.name === disciplineName);
      if (!data) return disciplineName;
      return (
        <div className="flex flex-row items-center">
          <div className="h-8 w-8">
            <data.Icon height={32} width={32} />
          </div>
          <span className="ml-2">{data.name}</span>
        </div>
      );
    },
  }),
  columnHelper.accessor("points", {
    header: "Points",
  }),
  columnHelper.accessor((row: AthleteContest) => {
    return contestSizeOptions.find(o => o.value === row.contestSize)?.label ?? row.contestSize;
  }, {
    id: "contestSize",
    enableColumnFilter: true,
    header: "Contest Size",
    meta: { filterVariant: 'select' },
  }),
  columnHelper.accessor("dates", {
    enableColumnFilter: true,
    header: "Date",
    meta: { filterVariant: "date" },
    filterFn: dateFilterFn,
  }),
];

type AthleteContestsTableProps = {
  contests: AthleteContest[];
};

const AthleteContestsTable = ({ contests }: AthleteContestsTableProps) => {
  return (
    <Table options={{ columns, data: contests }} />
  );
};

export default AthleteContestsTable;
