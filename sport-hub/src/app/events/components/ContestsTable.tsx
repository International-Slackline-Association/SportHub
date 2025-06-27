"use client"

import { createColumnHelper } from '@tanstack/react-table';
import Table from '@ui/Table';
import { mockContestWithAthletes } from "@mocks/contests_with_athletes_sample";
import Button from '@ui/Button';
import { cn } from '@utils/cn';

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
  }),
  columnHelper.accessor("verified", {
    header: "Results",
    cell: info => info.getValue() ? "✅ ISA Verified" : "Unverified",
  })
];

const ContestsTable = () => {
  return (
    <div className="mb-8">
      <div className={cn("cluster", "items-center", "justify-between")}>
        <h3>Contests</h3>
        <a href="/admin/submit/event">
          <Button className="mt-4 mb-4" variant="primary">
            Submit Event
          </Button>
        </a>
      </div>
      <Table options={{ columns, data: mockContestWithAthletes }} />
    </div>
  );
};

export default ContestsTable;
