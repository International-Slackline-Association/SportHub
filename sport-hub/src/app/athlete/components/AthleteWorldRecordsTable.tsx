import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
import Table from '@ui/Table';
import {
  certificateUrl,
  dateSortingFn,
  genderCellFormatter,
  Links,
  TitleBadge,
} from 'src/app/world_records/components/cellFormatters';
import { Alert } from '@ui/Alert';

const columnHelper = createColumnHelper<WorldRecord>();
const buildColumns = (athleteId?: string) => [
  columnHelper.accessor('date', {
    header: 'Date',
    enableSorting: true,
    sortingFn: dateSortingFn,
    size: 40,
  }),
  columnHelper.accessor('categoryName', {
    header: 'Category',
    cell: info => (
      <div className="stack gap-1 items-start">
        <span>{info.getValue()}</span>
        <TitleBadge title={info.row.original.title} standing={info.row.original.standing} />
      </div>
    ),
  }),
  columnHelper.accessor('value', {
    header: 'Record',
    size: 80,
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    cell: genderCellFormatter,
    size: 40,
  }),
  columnHelper.accessor('links', {
    header: "Links",
    cell: ({ row }) => (
      <Links entry={row.original} certificate={athleteId ? certificateUrl('record', row.original, athleteId) : null} />
    ),
    size: 40,
  }),
];

type AthleteWorldRecordsTableProps = {
  athleteId?: string;
  worldRecords: WorldRecord[];
};

const AthleteWorldRecordsTable = ({ worldRecords, athleteId }: AthleteWorldRecordsTableProps) => {
  const columns = useMemo(() => buildColumns(athleteId), [athleteId]);
  if (worldRecords.length === 0) {
    return <Alert variant="info">No world records found for this athlete.</Alert>;
  }
  return (
    <Table options={{ columns, data: worldRecords, initialState: { sorting: [{ id: 'date', desc: true }] } }} />
  );
};

export default AthleteWorldRecordsTable;
