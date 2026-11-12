import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldFirst } from '@lib/data-services';
import Table from '@ui/Table';
import {
  certificateUrl,
  dateSortingFn,
  genderCellFormatter,
  Links,
} from 'src/app/world_records/components/cellFormatters';
import { Alert } from '@ui/Alert';
import { AdminEditButton, useCanEditRecords } from 'src/app/world_records/components/AdminEditButton';

const columnHelper = createColumnHelper<WorldFirst>();
const buildColumns = (athleteId?: string) => [
  columnHelper.accessor('date', {
    header: 'Date',
    enableSorting: true,
    sortingFn: dateSortingFn,
    size: 40,
  }),
  columnHelper.accessor('trickName', {
    header: 'Trick',
    size: 120,
  }),
  columnHelper.accessor('categoryName', {
    header: 'Category',
    size: 60,
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    cell: genderCellFormatter,
    size: 40,
  }),
  columnHelper.accessor('links', {
    header: "Links",
    cell: ({ row }) => (
      <Links entry={row.original} certificate={athleteId ? certificateUrl('first', row.original, athleteId) : null} />
    ),
    size: 40,
  }),
  // Admins only: Edit button in its own column, outside the Links column
  columnHelper.display({
    id: 'edit',
    header: 'Admin',
    cell: ({ row }) => <AdminEditButton entry={row.original} />,
    size: 40,
  }),
];

type AthleteWorldFirstsTableProps = {
  athleteId?: string;
  worldFirsts: WorldFirst[];
};

const AthleteWorldFirstsTable = ({ worldFirsts, athleteId }: AthleteWorldFirstsTableProps) => {
  const columns = useMemo(() => buildColumns(athleteId), [athleteId]);
  const canEditRecords = useCanEditRecords();
  if (worldFirsts.length === 0) {
    return <Alert variant="info">No world firsts found for this athlete.</Alert>;
  }
  return (
    <Table options={{ columns, data: worldFirsts, initialState: { sorting: [{ id: 'date', desc: true }], columnVisibility: { edit: canEditRecords } } }} />
  );
};

export default AthleteWorldFirstsTable;
