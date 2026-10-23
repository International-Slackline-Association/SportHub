
import type { WorldFirst, WorldRecord } from "@lib/data-services";
import type { DisplayAthlete } from "@lib/records-service";
import { LIST_LABELS } from "@lib/records-logic";
import { CellContext, Row } from "@tanstack/react-table";
import { Badge } from "@ui/Badge";
import { CountryFlag } from "@ui/CountryFlag";
import Link from "next/link";

export const linkClassName = "underline text-blue-600 hover:text-blue-800 visited:text-purple-600";

// Generic formatters that infer the table row type `T` so they can be reused
// across tables typed with `WorldRecord` or `WorldFirst` (or a union).

export const AthleteNames = ({ athletes }: { athletes: DisplayAthlete[] }) => (
  <div className="stack gap-1">
    {athletes.map((athlete, idx) => (
      <div className="cluster gap-2 items-center" key={`${athlete.userId ?? athlete.name}_${idx}`}>
        <CountryFlag country={athlete.country ?? ""} defaultValue="" />
        {athlete.userId
          ? <Link href={`/athlete/${athlete.userId}`} className={linkClassName}>{athlete.name}</Link>
          : <span>{athlete.name}</span>
        }
      </div>
    ))}
  </div>
);

export const athletesCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, DisplayAthlete[]>) =>
  <AthleteNames athletes={info.getValue()} />;

/** "World Record" / "World First" in yellow, list titles neutral, no title = history. */
export const TitleBadge = ({ title }: { title: string }) => {
  if (!title) return <span className="text-xs text-gray-400">History</span>;
  return <Badge color={title.startsWith('World') ? 'YELLOW' : 'NEUTRAL'}>{title}</Badge>;
};

export const titleCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, string>) =>
  <TitleBadge title={info.getValue()} />;

const toSortable = (date: string) => date.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3$2$1');

/** Dates are displayed as DD/MM/YYYY, so sort on YYYYMMDD. */
export const dateSortingFn = <T extends WorldRecord | WorldFirst>(a: Row<T>, b: Row<T>, columnId: string) =>
  toSortable(a.getValue<string>(columnId)).localeCompare(toSortable(b.getValue<string>(columnId)));

export const listCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, string>) =>
  <>{LIST_LABELS[info.getValue() as keyof typeof LIST_LABELS] ?? info.getValue()}</>;

export const linkCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, string[]>) => (
  <div className="cluster gap-2">
    {info.getValue()?.map((link, idx) =>
      link && (
        <Link className={linkClassName} href={link} key={`link_${idx}`} target="_newtab">
          Link {idx + 1}
        </Link>
      )
    )}
  </div>
);

export const LIST_FILTER_OPTIONS = [
  { value: 'MEN', label: "Men's" },
  { value: 'WOMEN', label: "Women's" },
  { value: 'MIXED', label: 'Mixed' },
];
