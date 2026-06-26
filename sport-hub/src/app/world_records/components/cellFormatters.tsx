import { WorldFirst, WorldRecord } from "@lib/data-services";
import { CellContext } from "@tanstack/react-table";
import { CountryFlag } from "@ui/CountryFlag";
import Link from "next/link";

const linkClassName = "underline text-blue-600 hover:text-blue-800 visited:text-purple-600";

// Generic formatters that infer the table row type `T` so they can be reused

// across tables typed with `WorldRecord` or `WorldFirst` (or a union).
export const countryCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, string>) =>
  <CountryFlag country={info.getValue()} defaultValue="" />;

export const nameCellFormatter = <T extends WorldRecord | WorldFirst>(info: CellContext<T, string>) => {
  const userId = info.row.original.athleteUserId;
  return userId
    ? <Link href={`/athlete-profile/${userId}`} className={linkClassName}>{info.getValue()}</Link>
    : <>{info.getValue()}</>;
};

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
