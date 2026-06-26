'use client';

import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import Link from 'next/link';
import Table from '@ui/Table';
import { kebabCaseToTitleCase } from '@utils/strings';

export type ResultsTableRow = {
  userId: string;
  name: string;
  place: string;
  points?: number;
};

const columnHelper = createColumnHelper<ResultsTableRow>();
const linkClassName = 'text-blue-600 hover:text-blue-800 hover:underline font-medium';

const columns = [
  columnHelper.accessor('place', {
    header: 'Place',
    size: 48,
  }),
  columnHelper.accessor('name', {
    header: 'Athlete',
    cell: info => {
      const userId = info.row.original.userId;
      const formattedName = kebabCaseToTitleCase(info.getValue());
      return userId ? (
        <Link href={`/athlete-profile/${userId}`} className={linkClassName}>
          {formattedName}
        </Link>
      ) : (
        <>{formattedName}</>
      );
    },
    size: 180,
  }),
  columnHelper.accessor('points', {
    header: 'Points',
    cell: info => {
      const value = info.getValue();
      return Number.isFinite(value) ? value : '—';
    },
    size: 72,
  }),
];

type ResultsTableProps = {
  data: ResultsTableRow[];
};

const ResultsTable = ({ data }: ResultsTableProps) => {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const placeA = parseInt(a.place, 10);
      const placeB = parseInt(b.place, 10);
      if (!Number.isNaN(placeA) && !Number.isNaN(placeB)) return placeA - placeB;
      return String(a.place).localeCompare(String(b.place));
    });
  }, [data]);

  return (
    <Table
      options={{
        columns,
        data: sortedData,
      }}
    />
  );
};

export default ResultsTable;
