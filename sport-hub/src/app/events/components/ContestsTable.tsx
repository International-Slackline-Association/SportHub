"use client"

import { createColumnHelper } from '@tanstack/react-table';
import Table from '@ui/Table';
import { ContestData } from "@lib/data-services";
import Button from '@ui/Button';
import { cn } from '@utils/cn';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { DISCIPLINE_DATA, MAP_DISCIPLINE_ENUM_TO_NAME } from '@utils/consts';
import { CircleFlag } from 'react-circle-flags';
import { COUNTRIES } from '@utils/countries';

const CountryFlagWithName = ({ countryCode, defaultValue="N/A" }: { countryCode: string, defaultValue?: string }) => {
  if (countryCode === 'N/A' || !countryCode) {
    return <span className="text-gray-500">{defaultValue}</span>;
  }

  const country = COUNTRIES.find(c => c.code.toLowerCase() === countryCode.toLowerCase());
  const countryName = country?.name || countryCode.toUpperCase();

  return (
    <div className="flex items-center gap-2" title={countryName}>
      <CircleFlag countryCode={countryCode.toLowerCase()} height={22} width={22} />
      <span className="text-sm text-gray-600">{countryName}</span>
    </div>
  );
};

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
    cell: info => (
      <CountryFlagWithName countryCode={info.getValue()} />
    ),
    meta: { filterVariant: 'select' },
  }),
  columnHelper.accessor("discipline", {
    enableColumnFilter: true,
    header: "Discipline",
    cell: info => {
      let discipline = info.getValue();
      if (Number.isInteger(Number(discipline))) {
        discipline = MAP_DISCIPLINE_ENUM_TO_NAME[Number(discipline)];
      }

      const data = DISCIPLINE_DATA[discipline as keyof typeof DISCIPLINE_DATA];

      if (!data) {
        return discipline;
      }

      return (
        <div className="flex flex-row items-center">
          <div className="h-8 w-8">
            <data.Icon height={32} width={32} />
          </div>
          <span className="ml-2">{data.name}</span>
        </div>
      );
    },
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

      const displayName = `${winner.name} ${winner.surname || ''}`.trim();
      return (
        <Link
          href={`/athlete-profile/${winner.userId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          {displayName}
        </Link>
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

  const canSubmitEvents =
    session?.user?.role === 'admin' ||
    session?.user?.userSubTypes?.includes('organizer');

  if (!canSubmitEvents) {
    return null;
  }

  return (
    <Link href="/events/submit">
      <Button variant="secondary">
        Submit Event
      </Button>
    </Link>
  );
};

const ContestsTable = () => {
  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await fetch('/api/events/contests')).json(),
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
