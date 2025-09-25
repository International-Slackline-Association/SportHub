"use client";

import { createColumnHelper } from '@tanstack/react-table';
import { AthleteRanking } from '@lib/data-services';
import Table from '@ui/Table';

const columnHelper = createColumnHelper<AthleteRanking>();

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
        const displayName = athlete.fullName || athlete.name || `${athlete.name} ${athlete.surname || ''}`;
        return (
          <a
            href={`/athlete-profile/${athlete.athleteId}`}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            {displayName}
          </a>
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
  rankings: AthleteRanking[];
};

const RankingsTable = ({ rankings }: RankingsTableProps) => {
  return (
    <Table options={{ columns, data: rankings }} title="Rankings" />
  );
};

export default RankingsTable;
