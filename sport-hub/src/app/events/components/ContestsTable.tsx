"use client"

import { createColumnHelper } from '@tanstack/react-table';
import Table from '@ui/Table';
import { ContestData } from "@lib/data-services";
import Button from '@ui/Button';
import { cn } from '@utils/cn';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

const columnHelper = createColumnHelper<ContestData>();
const columns = [
  columnHelper.accessor("name", {
    enableColumnFilter: true,
    header: "Event Name",
    meta: {
      filterVariant: "text",
    },
    filterFn: "includesString",
    cell: (info) => (
      <Link href={`/events/${info.row.original.eventId}`} className="text-blue-600 hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("date", {
    enableColumnFilter: true,
    header: "Date",
    cell: info => {
      const date = info.getValue();
      try {
        return new Date(date).toLocaleDateString('en-GB');
      } catch {
        return date;
      }
    },
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
    header: "Prize Value",
  }),
  columnHelper.accessor((row: ContestData) => String(row.athletes.length), {
    enableColumnFilter: true,
    header: "Size",
  }),
  columnHelper.accessor("athletes", {
    header: "Winner",
    cell: info => {
      const athletes = info.getValue();
      if (!athletes || athletes.length === 0) return "No results";

      // Find the winner (place "1")
      const winner = athletes.find(athlete => athlete.place === "1");
      if (!winner) return "No winner";

      return (
        <a
          href={`/athlete-profile/${winner.userId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          {winner.name}
        </a>
      );
    },
  }),
  columnHelper.accessor("verified", {
    header: "Results",
    cell: info => info.getValue() ? "✅ ISA Verified" : "Unverified",
  })
];

const SubmitButton = () => {
  const { data: session } = useSession();
  const ADMIN_IDS = ["6f75dd45-2d90-4804-920f-d180ff71411a", "6501e189-14a7-48f4-8e22-620ac3d3760b"];
  const hideSubmitButton = !ADMIN_IDS.includes(session?.user?.id || "");

  if (hideSubmitButton) {
    return null;
  }

  return (
    <a href="/admin/submit/event">
      <Button variant="secondary">
        Submit Event
      </Button>
    </a>
  );
};

const ContestsTable = () => {
  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await fetch('/api/events')).json(),
  });

  if (eventsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (eventsQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center text-red-600">
          <p>Failed to load events data</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("cluster", "items-center", "justify-end", "mb-4")}>
        <SubmitButton />
      </div>
      <Table options={{ columns, data: eventsQuery.data || [] }} title="Events" />
    </>
  );
};

export default ContestsTable;
