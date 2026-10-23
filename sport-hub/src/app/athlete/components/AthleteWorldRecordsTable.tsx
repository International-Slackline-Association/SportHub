import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
import Table from '@ui/Table';
import {
  dateSortingFn,
  certificateUrl,
  linkCellFormatter,
  linkClassName,
  listCellFormatter,
  titleCellFormatter,
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
  columnHelper.accessor('title', {
    header: 'Title',
    cell: titleCellFormatter,
    size: 80,
  }),
  columnHelper.accessor('categoryName', {
    header: 'Category',
  }),
  columnHelper.accessor('value', {
    header: 'Record',
    size: 80,
  }),
  columnHelper.accessor('list', {
    header: 'List',
    cell: listCellFormatter,
    size: 40,
  }),
  columnHelper.accessor('links', {
    header: "Links",
    cell: linkCellFormatter,
    size: 40,
  }),
  columnHelper.display({
    id: 'certificate',
    header: 'Certificate',
    size: 40,
    cell: ({ row }) => {
      const url = athleteId ? certificateUrl('record', row.original, athleteId) : null;
      return url ? <a className={linkClassName} href={url} target="_blank" rel="noreferrer">PDF</a> : null;
    },
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
