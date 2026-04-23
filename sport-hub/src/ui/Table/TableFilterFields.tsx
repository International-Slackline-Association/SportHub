import { Column, Row } from "@tanstack/react-table";
import styles from "./styles.module.css";
import Autocomplete from "@ui/Form/Autocomplete";

type TableFilterProps<TData,> = {
  column: Column<TData, unknown>;
  rows: Row<TData>[];
}

type DateFilterValue = { year?: string; month?: string; day?: string } | undefined;
type DateParts = { year: number; month: number; day: number };

function parseDateString(raw: string): DateParts | null {
  if (!raw) return null;
  // ISO format: 2024-06-01 or 2024-06-01T...
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  // en-GB format: 01/06/2024
  const gb = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (gb) return { year: Number(gb[3]), month: Number(gb[2]), day: Number(gb[1]) };
  return null;
}

export const ageCategoryFilterFn = <TData,>(
  row: Row<TData>,
  columnId: string,
  filterValue: string,
): boolean => {
  if (!filterValue) return true;
  const age = row.getValue<number | undefined>(columnId);
  if (filterValue === 'youth') return age != null && age < 18;
  if (filterValue === 'senior') return age != null && age >= 35;
  return true;
};
ageCategoryFilterFn.autoRemove = (val: unknown) => !val;

export function dateFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: DateFilterValue,
): boolean {
  if (!filterValue || (!filterValue.year && !filterValue.month && !filterValue.day)) return true;
  const raw = row.getValue<string>(columnId);
  const date = parseDateString(raw);
  if (!date) return false;
  if (filterValue.year && String(date.year) !== filterValue.year) return false;
  if (filterValue.month && String(date.month) !== filterValue.month) return false;
  if (filterValue.day && String(date.day) !== filterValue.day) return false;
  return true;
}

const MONTHS = [
  { value: '1', label: 'Jan' }, { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' }, { value: '4', label: 'Apr' },
  { value: '5', label: 'May' }, { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' }, { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' }, { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
];

const TextTableFilter = <TData,>({ column }: TableFilterProps<TData>) => {
  const id = column.id;
  const columnName = column.columnDef?.header?.toString() || "";
  const placeholder = column.columnDef.meta?.filterPlaceholder ?? `Enter ${columnName.toLowerCase()}`;

  return (
    <div className={styles.columnFilter} key={`column-filter-${id}`}>
      <label htmlFor={id}>{columnName}</label>
      <input
        id={id}
        name={columnName}
        onChange={e => column.setFilterValue(e.target.value || undefined)}
        placeholder={placeholder}
        value={String(column.getFilterValue() || "")}
        type="text"
      />
    </div>
  );
};

const SelectTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const id = column.id;
  const columnName = column.columnDef.header?.toString();
  const explicitOptions = column.columnDef.meta?.filterOptions;

  // Use explicit options when provided (e.g. full discipline/size lists from consts).
  // Otherwise derive unique values from the current data rows.
  const options: { value: string; label: string }[] = explicitOptions
    ?? [...new Set(rows.map(row => String(row.getValue(column.id))))].sort().map(v => ({ value: v, label: v }));

  const noAll = column.columnDef.meta?.filterNoAll;

  return (
    <div className={styles.columnFilter} key={`column-filter-${id}`}>
      <label htmlFor={id}>{columnName}</label>
      <select
        id={id}
        name={columnName}
        onChange={e => column.setFilterValue(e.target.value || undefined)}
        value={String(column.getFilterValue() ?? '')}
      >
        {!noAll && <option value={""}>All</option>}
        {options.map(({ value, label }) => (<option key={value} value={value}>{label}</option>))}
      </select>
    </div>
  );
};

const DateTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const id = column.id;
  const columnName = column.columnDef.header?.toString() || "";
  const filterValue = (column.getFilterValue() as DateFilterValue) ?? {};

  // Derive years from actual data — only show years that exist in the rows
  const years = [...new Set(
    rows
      .map(row => parseDateString(row.getValue<string>(column.id)))
      .filter((d): d is DateParts => d !== null)
      .map(d => String(d.year))
  )].sort();
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  const update = (patch: { year?: string; month?: string; day?: string }) => {
    const next = { ...filterValue, ...patch };
    if (!next.year && !next.month && !next.day) {
      column.setFilterValue(undefined);
    } else {
      column.setFilterValue(next);
    }
  };

  return (
    <div className={styles.columnFilter} key={`column-filter-${id}`}>
      <label htmlFor={`${id}-year`}>{columnName}</label>
      <div className={styles.dateFilterSelects}>
        <select
          id={`${id}-year`}
          value={filterValue.year ?? ''}
          onChange={e => update({ year: e.target.value || undefined })}
        >
          <option value="">Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={filterValue.month ?? ''}
          onChange={e => update({ month: e.target.value || undefined })}
        >
          <option value="">Month</option>
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select
          value={filterValue.day ?? ''}
          onChange={e => update({ day: e.target.value || undefined })}
        >
          <option value="">Day</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </div>
  );
};

const AutocompleteTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const id = column.id;
  const columnName = column.columnDef.header?.toString();
  const explicitOptions = column.columnDef.meta?.filterOptions;

  const options: { value: string; label: string }[] = explicitOptions
    ?? [...new Set(rows.map(row => String(row.getValue(column.id))))].sort().map(v => ({ value: v, label: v }));

  return (
    <div className={styles.columnFilter} key={`column-filter-${id}`}>
      <label htmlFor={id}>{columnName}</label>
      <Autocomplete
        id={id}
        value={String(column.getFilterValue() ?? '')}
        onChange={(v) => column.setFilterValue(v || undefined)}
        options={options}
        placeholder="All"
      />
    </div>
  );
};

const TableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const filterVariant = column.columnDef?.meta?.filterVariant;

  if (filterVariant === "text") {
    return <TextTableFilter column={column} rows={rows} />;
  }

  if (filterVariant === "date") {
    return <DateTableFilter column={column} rows={rows} />;
  }

  if (filterVariant === "autocomplete") {
    return <AutocompleteTableFilter column={column} rows={rows} />;
  }

  return <SelectTableFilter column={column} rows={rows} />;
};

export default TableFilter;
