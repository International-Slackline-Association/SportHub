"use client"

import { createColumnHelper } from '@tanstack/react-table';
import Table from '@ui/Table';
import { ContestData } from "@lib/data-services";
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DISCIPLINE_DATA, MAP_CONTEST_TYPE_ENUM_TO_NAME, MAP_CONTEST_GENDER_ENUM_TO_NAME } from '@utils/consts';
import { CircleFlag } from 'react-circle-flags';
import { COUNTRIES, getIocCode, getIso2FromIoc } from '@utils/countries';
import { contestSizeOptions } from '@ui/Form/commonOptions';
import { dateFilterFn } from '@ui/Table/TableFilterFields';
import Spinner from '@ui/Spinner';
import { Alert } from '@ui/Alert';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import { CountryFlag } from '@ui/CountryFlag';

const CountryFlagWithName = ({ iocCode, defaultValue="N/A" }: { iocCode: string, defaultValue?: string }) => {
  if (iocCode === 'N/A' || !iocCode) {
    return <span className="text-gray-500">{defaultValue}</span>;
  }

  const iso2 = getIso2FromIoc(iocCode);
  const country = COUNTRIES.find(c => c.code === iso2);
  const countryName = country?.name ?? iocCode;

  return (
    <div className="flex items-center gap-2" title={countryName}>
      <CircleFlag countryCode={iso2} height={22} width={22} />
      <span className="text-sm text-gray-600">{countryName}</span>
    </div>
  );
};

const columnHelper = createColumnHelper<ContestData>();
const columns = [
  // Mobile: single stacked column
  columnHelper.display({
    id: 'event',
    header: 'Event',
    cell: info => {
      const { name, date, category, country, discipline, athletes, eventId } = info.row.original;
      const d = String(discipline);
      const disciplineData = DISCIPLINE_DATA[d as keyof typeof DISCIPLINE_DATA]
        ?? Object.values(DISCIPLINE_DATA).find(e => e.enumValue === Number(d));
      const contestType = MAP_CONTEST_TYPE_ENUM_TO_NAME[category];
      const size = contestSizeOptions.find(o => o.value === contestType)?.label ?? String(category);
      const winner = athletes?.find(a => a.place === '1');
      const winnerName = winner ? `${winner.name} ${winner.surname || ''}`.trim() : null;
      const genderKey = MAP_CONTEST_GENDER_ENUM_TO_NAME[info.row.original.gender];
      const genderLabel = ({ MIXED: 'Mixed', MEN_ONLY: 'Men', WOMEN_ONLY: 'Women' } as Record<string, string>)[genderKey] ?? genderKey;
      let formattedDate = date;
      try { formattedDate = new Date(date).toLocaleDateString('en-GB'); } catch { /* keep raw */ }
      return (
        <div className="stack gap-1">
          <div className="cluster justify-between items-center text-gray-400 mb-2">
            <span className="text-xs">{formattedDate}</span>
            {disciplineData && (
              <div className="cluster gap-1 items-center text-xs">
                <disciplineData.Icon height={16} width={16} />
                <span>{disciplineData.name}</span>
                <span>{size}</span>
              </div>
            )}
          </div>
          <Link href={`/events/${eventId}`} className="text-blue-600 hover:underline font-medium">
            {name}
          </Link>
          <div className="cluster justify-start items-center gap-2">
            {winner && (
              <Link href={`/athlete-profile/${winner?.userId}`} className="text-blue-600 hover:underline">
                {winnerName}
              </Link>
            )}
            <CountryFlag country={country} />
            <span className="text-xs text-gray-400" style={{ paddingTop: 2 }}>{genderLabel}</span>          </div>
        </div>
      );
    },
  }),
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
    meta: { filterVariant: "date" },
    filterFn: dateFilterFn,
    cell: info => {
      const date = info.getValue();
      try {
        return new Date(date).toLocaleDateString('en-GB');
      } catch {
        return date;
      }
    },
    size: 120,
  }),
  columnHelper.accessor((row: ContestData) => getIocCode(row.country), {
    id: "country",
    enableColumnFilter: true,
    header: "Country",
    cell: info => (
      <CountryFlagWithName iocCode={info.getValue()} />
    ),
    meta: { filterVariant: 'select' },
    size: 120,
  }),
  columnHelper.accessor((row: ContestData) => {
    const d = String(row.discipline);
    const byKey = DISCIPLINE_DATA[d as keyof typeof DISCIPLINE_DATA];
    if (byKey) return byKey.name;
    return Object.values(DISCIPLINE_DATA).find(e => e.enumValue === Number(d))?.name ?? d;
  }, {
    id: "discipline",
    enableColumnFilter: true,
    header: "Discipline",
    meta: { filterVariant: 'select' },
    cell: info => {
      const disciplineName = info.getValue();
      const data = Object.values(DISCIPLINE_DATA).find(d => d.name === disciplineName);
      if (!data) return disciplineName;
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
  columnHelper.accessor((row: ContestData) => {
    const key = MAP_CONTEST_GENDER_ENUM_TO_NAME[row.gender];
    const labels: Record<string, string> = { MIXED: "Mixed", MEN_ONLY: "Men", WOMEN_ONLY: "Women" };
    return labels[key] ?? key ?? String(row.gender);
  }, {
    id: "gender",
    enableColumnFilter: true,
    header: "Gender",
    filterFn: (row, columnId, filterValue: string) => row.getValue<string>(columnId) === filterValue,
    meta: { filterVariant: 'select' },
  }),
  columnHelper.accessor("prize", {
    header: "Total Event Prize Value (€)",
    size: 72,
  }),
  columnHelper.accessor((row: ContestData) => {
    const key = MAP_CONTEST_TYPE_ENUM_TO_NAME[row.category];
    return contestSizeOptions.find(o => o.value === key)?.label ?? String(row.category);
  }, {
    id: "size",
    enableColumnFilter: true,
    header: "Size",
    meta: { filterVariant: 'select' },
    size: 120,
  }),
  columnHelper.accessor("athletes", {
    header: "Winner",
    cell: info => {
      const athletes = info.getValue();
      if (!athletes || athletes.length === 0) return "No results";

      // Find the winner (place "1")
      const winner = athletes.find(athlete => athlete.place === "1");
      if (!winner) return "TBD";

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
    size: 120,
  }),
  columnHelper.accessor("verified", {
    header: "ISA Verified",
    cell: info => info.getValue() ? "✅" : "",
    size: 60,
  })
];

const ContestsTable = ({ initialData }: { initialData?: ContestData[] }) => {
  const { isDesktop } = useClientMediaQuery();
  const { error, data = [], isError, isLoading, isSuccess } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await fetch('/api/events/contests')).json(),
    initialData,
    staleTime: 60_000,
  });

  return (
    <div className="flex items-center justify-center min-h-64">
      {isLoading && (
        <div className="text-center">
          <Spinner/>
          <p>Loading events...</p>
        </div>
      )}
      {isError && (
        <Alert>Error loading events: {error?.message}</Alert>
      )}
      {isSuccess && (
        <Table options={{
          columns,
          data,
          initialState: {
            columnOrder: isDesktop
              ? ['name', 'date', 'country', 'discipline', 'gender', 'prize', 'size', 'athletes', 'verified']
              : ['event'],
            columnVisibility: {
              event:      !isDesktop,
              name:       !!isDesktop,
              date:       !!isDesktop,
              country:    !!isDesktop,
              discipline: !!isDesktop,
              gender:     !!isDesktop,
              prize:      !!isDesktop,
              size:       !!isDesktop,
              athletes:   !!isDesktop,
              verified:   !!isDesktop,
            },
          },
        }} />
      )}
    </div>
  );
};

export default ContestsTable;
