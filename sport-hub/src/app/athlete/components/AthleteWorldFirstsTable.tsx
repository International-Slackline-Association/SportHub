import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldFirst } from '@lib/data-services';
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

const columnHelper = createColumnHelper<WorldFirst>();
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
  columnHelper.accessor('trickName', {
    header: 'Trick',
    size: 120,
  }),
  columnHelper.accessor('categoryName', {
    header: 'Category',
    size: 60,
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
      const url = athleteId ? certificateUrl('first', row.original, athleteId) : null;
      return url ? <a className={linkClassName} href={url} target="_blank" rel="noreferrer">PDF</a> : null;
    },
  }),
];

type AthleteWorldFirstsTableProps = {
  athleteId?: string;
  worldFirsts: WorldFirst[];
};

const AthleteWorldFirstsTable = ({ worldFirsts, athleteId }: AthleteWorldFirstsTableProps) => {
  const columns = useMemo(() => buildColumns(athleteId), [athleteId]);
  if (worldFirsts.length === 0) {
    return <Alert variant="info">No world firsts found for this athlete.</Alert>;
  }
  return (
    <Table options={{ columns, data: worldFirsts, initialState: { sorting: [{ id: 'date', desc: true }] } }} />
  );
};

export default AthleteWorldFirstsTable;
