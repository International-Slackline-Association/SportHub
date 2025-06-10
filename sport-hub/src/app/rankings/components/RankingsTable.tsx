"use client";

import { createColumnHelper } from '@tanstack/react-table';
import { mockRankings } from '@mocks/rankings_data';
import Table from '@ui/Table';

const columnHelper = createColumnHelper<Ranking>();
  
  const columns = [
    columnHelper.display({
      header: 'Rank',
      cell: info => info.row.index + 1,
    }),
    columnHelper.accessor('fullName', {
      enableColumnFilter: true,
      header: 'Name',
      cell: info => {
        const athlete = info.row.original;
        return (
          athlete.fullName || `${athlete.name} ${athlete.surname}`
        );
      },
      meta: { filterVariant: 'text' },
    }),
    columnHelper.accessor('ageCategory', {
      enableColumnFilter: true,
      header: 'Age Category',
      meta: { filterVariant: 'select' },
    }),
    columnHelper.accessor('country', {
      enableColumnFilter: true,
      header: 'Country',
      meta: { filterVariant: 'select' },
    }),
    columnHelper.accessor('points', {
      header: 'Points',
    }),
  ];

type RankingsTableProps = {
  rankings?: Ranking[];
};

const RankingsTable = ({ rankings = mockRankings }: RankingsTableProps) => {
  return (
    <div className="mb-8">
      <Table options={{ columns, data: rankings }} title="Rankings" />
    </div>
  );
};

export default RankingsTable;
