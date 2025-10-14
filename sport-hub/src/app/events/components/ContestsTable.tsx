"use client"

import { useState, useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import Table from '@ui/Table';
import { ContestData } from "@lib/data-services";
import Button from '@ui/Button';
import { cn } from '@utils/cn';

const columnHelper = createColumnHelper<ContestData>();
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
          href={`/athlete-profile/${winner.athleteId}`}
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

const ContestsTable = () => {
  const [contests, setContests] = useState<ContestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadContests() {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setContests(data);
      } catch (err) {
        console.error('Error loading events:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadContests();
  }, []);

  if (loading) {
    return (
      <>
        <div className={cn("cluster", "items-center", "justify-between", "mb-4")}>
          <h3>Contests</h3>
          <a href="/admin/submit/event">
            <Button variant="secondary">
              Submit Event
            </Button>
          </a>
        </div>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading events...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className={cn("cluster", "items-center", "justify-between", "mb-4")}>
          <h3>Contests</h3>
          <a href="/admin/submit/event">
            <Button variant="secondary">
              Submit Event
            </Button>
          </a>
        </div>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center text-red-600">
            <p>Failed to load events data</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={cn("cluster", "items-center", "justify-between", "mb-4")}>
        <h3>Contests</h3>
        <a href="/admin/submit/event">
          <Button variant="secondary">
            Submit Event
          </Button>
        </a>
      </div>
      <Table options={{ columns, data: contests }} />
    </>
  );
};

export default ContestsTable;
