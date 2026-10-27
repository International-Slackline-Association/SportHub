
import type { WorldFirst, WorldRecord } from "@lib/data-services";
import type { DisplayAthlete } from "@lib/records-service";
import { CellContext, Row } from "@tanstack/react-table";
import { Badge, Gender } from "@ui/Badge";
import { CountryFlag, resolveIso2 } from "@ui/CountryFlag";
import { COUNTRIES } from "@utils/countries";
import Link from "next/link";
import { AdminEditLink } from "./AdminEditLink";

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

/** Athlete names, one per line, linked to their profiles. Sorts on the joined names. */
export const athleteNamesAccessor = (row: WorldRecord | WorldFirst) => row.athletes.map(a => a.name).join(', ');

export const athleteNamesCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, string>) => (
  <div className="stack gap-1">
    {info.row.original.athletes.map((athlete, idx) => (
      <span key={`${athlete.userId ?? athlete.name}_${idx}`}>
        {athlete.userId
          ? <Link href={`/athlete/${athlete.userId}`} className={linkClassName}>{athlete.name}</Link>
          : athlete.name
        }
      </span>
    ))}
  </div>
);

/** Claims store ISO codes, imported rows country names: both become the country name. */
const countryName = (country: string) => COUNTRIES.find(c => c.code === resolveIso2(country))?.name ?? country;

/** Countries of the athletes, without repeats, so the select filter lists each country once. */
export const athleteCountriesAccessor = (row: WorldRecord | WorldFirst) =>
  [...new Set(row.athletes.map(a => a.country).filter(Boolean).map(c => countryName(c!)))];

export const countriesCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, string[]>) => (
  <div className="stack gap-1">
    {info.getValue().map(country => <CountryFlag key={country} country={country} defaultValue="" />)}
  </div>
);

export const countriesSortingFn = <T extends WorldRecord | WorldFirst>(a: Row<T>, b: Row<T>, columnId: string) =>
  a.getValue<string[]>(columnId).join(', ').localeCompare(b.getValue<string[]>(columnId).join(', '));

export const genderCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, RecordGender>) =>
  <Gender value={info.getValue()} variant="normal" />;

export const genderFilterFn = <T extends WorldRecord | WorldFirst>(row: Row<T>, columnId: string, filterValue: string) =>
  row.getValue<string>(columnId) === filterValue;

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

export const Links = ({ entry, certificate }: { entry: WorldRecord | WorldFirst; certificate?: string | null }) => (
  <div className="cluster gap-2">
    {entry.links.map((link, idx) =>
      link && (
        <Link className={linkClassName} href={link} key={`link_${idx}`} target="_newtab">
          Link {idx + 1}
        </Link>
      )
    )}
    {certificate && <a className={linkClassName} href={certificate} target="_blank" rel="noreferrer">Certificate</a>}
    <AdminEditLink entry={entry} />
  </div>
);

export const linkCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, string[]>) =>
  <Links entry={info.row.original} />;

/** Certificate PDF of one athlete on an entry (FR-26). */
export const certificateUrl = (kind: 'record' | 'first', entry: WorldRecord | WorldFirst, athleteId: string) => {
  const index = entry.athletes.findIndex(a => a.userId === athleteId);
  return index < 0 ? null : `/api/certificates/${kind}/${encodeURIComponent(entry.entryId)}?athlete=${index}`;
};
