"use client"

import { createColumnHelper } from '@tanstack/react-table';
import Table from '@ui/Table';
import { mockContestWithAthletes } from "@mocks/contests_with_athletes_sample";

const columnHelper = createColumnHelper<Contest>();
const columns = [
  columnHelper.accessor("name", {
    enableColumnFilter: true,
    header: "Event Name",
    meta: {
      filterVariant: "text",
    },
    filterFn: "includesString",
  }),
  columnHelper.accessor("date", {
    enableColumnFilter: true,
    header: "Date",
  }),
  columnHelper.accessor("country", {
    enableColumnFilter: true,
    header: "Country",
  }),
  columnHelper.accessor("discipline", {
    enableColumnFilter: true,
    header: "Disciplines",
  }),
  columnHelper.accessor("prize", {
    header: "Total Event Prize Value",
  }),
  columnHelper.accessor((row: Contest) => String(row.athletes.length), {
    enableColumnFilter: true,
    header: "Contest Size",
  })
];

const ContestsTable = () => {
  return (
    <div className="mb-8">
      <h3>Contests</h3>
      <Table options={{ columns, data: mockContestWithAthletes }} />
    </div>
  );
};

export default ContestsTable;
