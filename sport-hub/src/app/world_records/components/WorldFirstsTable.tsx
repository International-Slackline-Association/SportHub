"use client";

import { createColumnHelper } from '@tanstack/react-table';
import { WorldFirst } from '@lib/data-services';
import Table from '@ui/Table';
import { BREAKPOINT_LG, useClientMediaQuery } from '@utils/useClientMediaQuery';
import Link from 'next/link';
import { Gender } from '@ui/Badge';
import {
  athleteCountriesAccessor,
  athleteNamesAccessor,
  athleteNamesCellFormatter,
  AthleteNames,
  countriesCellFormatter,
  countriesSortingFn,
  dateSortingFn,
  genderCellFormatter,
  genderFilterFn,
  linkCellFormatter,
  linkClassName,
} from './cellFormatters';
import { AdminEditLink } from './AdminEditLink';

const columnHelper = createColumnHelper<WorldFirst>();

const sharedColumns = [
  columnHelper.accessor('categoryName', {
    header: 'Category',
    enableColumnFilter: true,
    meta: { filterVariant: 'select', filterIncludeAll: true },
    size: 60,
  }),
  columnHelper.accessor('trickName', {
    header: 'Trick',
    enableColumnFilter: true,
    meta: { filterVariant: 'autocomplete' },
    size: 100,
  }),
  columnHelper.accessor(athleteCountriesAccessor, {
    id: 'country',
    header: 'Country',
    enableColumnFilter: true,
    cell: countriesCellFormatter,
    sortingFn: countriesSortingFn,
    filterFn: 'arrIncludes',
    meta: { filterVariant: 'select', filterIncludeAll: true },
    size: 80,
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    enableColumnFilter: true,
    filterFn: genderFilterFn,
    cell: genderCellFormatter,
    meta: { filterVariant: 'record-gender' },
    size: 40,
  }),
];

const columns = [
  // Mobile: single stacked column
  columnHelper.display({
    id: 'worldFirst',
    header: 'World First',
    cell: info => {
      const { date, categoryName, trickName, lineDetails, gender, athletes, links } = info.row.original;
      return (
        <div className="stack">
          <div className="cluster items-center justify-between">
            <span className="text-xs text-gray-400">{date}</span>
            <Gender value={gender} variant="normal" />
          </div>
          <div className="cluster items-center justify-between">
            <span className="font-medium">{trickName}</span>
            <span className="text-sm text-gray-500">{lineDetails || categoryName}</span>
          </div>
          <AthleteNames athletes={athletes} />
          <div className="cluster gap-2 text-xs">
            {links.map((link, idx) => (
              <Link className={linkClassName} href={link} key={`link_${idx}`} target="_newtab">
                Link {idx + 1}
              </Link>
            ))}
            <AdminEditLink entry={info.row.original} />
          </div>
        </div>
      );
    },
  }),
  // Desktop-only columns
  columnHelper.accessor('date', { header: 'Date', sortingFn: dateSortingFn, size: 40 }),
  columnHelper.accessor(athleteNamesAccessor, {
    id: 'name',
    header: 'Name',
    cell: athleteNamesCellFormatter,
    size: 100,
  }),
  columnHelper.accessor('links', {
    header: "Links",
    cell: linkCellFormatter,
    size: 40,
  }),
  // Shared filterable columns
  ...sharedColumns,
];

type WorldFirstsTableProps = {
  data: WorldFirst[];
};

const WorldFirstsTable = ({ data }: WorldFirstsTableProps) => {
  const { isDesktop } = useClientMediaQuery(BREAKPOINT_LG);

  return (
    <Table
      options={{
        columns,
        data,
        initialState: {
          sorting: [{ id: 'date', desc: true }],
          columnOrder: isDesktop
            ? ['trickName', 'categoryName', 'name', 'country', 'gender', 'date', 'links']
            : ['worldFirst', 'trickName', 'categoryName', 'country', 'gender'],
          columnVisibility: {
            worldFirst:   !isDesktop,
            date:         !!isDesktop,
            name:         !!isDesktop,
            country:      !!isDesktop,
            trickName:    !!isDesktop,
            categoryName: !!isDesktop,
            gender:       !!isDesktop,
            links:        !!isDesktop,
          },
        },
      }}
    />
  );
};

export default WorldFirstsTable;
