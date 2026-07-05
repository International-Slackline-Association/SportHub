import { Column, Row } from "@tanstack/react-table";
import styles from "./styles.module.css";
import Autocomplete from "@ui/Form/Autocomplete";
import { COUNTRIES } from "@utils/countries";

type DateRangeFilterValue = { startDate?: string; endDate?: string } | undefined;
type DateRangeRowValue = { startDate?: string; endDate?: string };

type TableFilterProps<TData,> = {
  column: Column<TData, unknown>;
  rows: Row<TData>[];
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

function isValidIsoDate(raw: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw);
}

export function dateFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: DateRangeFilterValue,
): boolean {
  const isMissingDateRangeFilter = !filterValue || (!filterValue.startDate && !filterValue.endDate);
  if (isMissingDateRangeFilter) {
    return true;
  }

  const rowValue = row.getValue<DateRangeRowValue>(columnId);
  if (!rowValue || !rowValue.startDate || !isValidIsoDate(rowValue.startDate)) {
    return false;
  }

  const rowStartDate = rowValue.startDate;
  const rowEndDate = rowValue.endDate || rowValue.startDate;

  // Row overlaps with filter range if: row doesn't end before filter starts AND row doesn't start after filter ends
  if (filterValue.startDate && rowEndDate < filterValue.startDate) return false;
  if (filterValue.endDate && rowStartDate > filterValue.endDate) return false;

  return true;
}

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

const CountryTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const id = column.id;
  const columnName = column.columnDef.header?.toString();

  const options: { value: string; label: string }[] = 
    [...new Set(rows.map(row => String(row.getValue(column.id))))]
    .map(countryIoc => ({ value: countryIoc, label: COUNTRIES.find(c => c.ioc === countryIoc)?.name || countryIoc }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className={styles.columnFilter} key={`column-filter-${id}`}>
      <label htmlFor={id}>{columnName}</label>
      <select
        id={id}
        name={columnName}
        onChange={e => column.setFilterValue(e.target.value || undefined)}
        value={String(column.getFilterValue() ?? '')}
      >
        <option value={""}>All</option>
        {options.map(({ value, label }) => (<option key={value} value={value}>{label}</option>))}
      </select>
    </div>
  );
};

const DateRangeTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const id = column.id;
  const filterValue = (column.getFilterValue() as DateRangeFilterValue) ?? {};

  const minDate = [...rows]
    .map(row => {
      const rowValue = row.getValue<DateRangeRowValue>(column.id);
      return rowValue?.startDate || '';
    })
    .filter(value => isValidIsoDate(value))
    .sort()[0];

  const update = (patch: { startDate?: string; endDate?: string }) => {
    const next = { ...filterValue, ...patch };
    const cleaned = {
      ...(next.startDate ? { startDate: next.startDate } : {}),
      ...(next.endDate ? { endDate: next.endDate } : {}),
    };

    if (!cleaned.startDate && !cleaned.endDate) {
      column.setFilterValue(undefined);
    } else {
      column.setFilterValue(cleaned);
    }
  };

  return (
    <div className={styles.columnFilter} key={`column-filter-${id}`}>
      <div className="cluster gap-2">
        <div className="stack">
          <label htmlFor={`${id}-start`}>Start Date</label>
          <input
            id={`${id}-start`}
            min={minDate}
            onChange={e => update({ startDate: e.target.value || undefined })}
            type="date"
            value={filterValue.startDate ?? ''}
          />
        </div>
        <div className="stack">
          <label htmlFor={`${id}-end`}>End Date</label>
          <input
            id={`${id}-end`}
            min={minDate}
            onChange={e => update({ endDate: e.target.value || undefined })}
            type="date"
            value={filterValue.endDate ?? ''}
          />
        </div>
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

  if (filterVariant === "date-range") {
    return <DateRangeTableFilter column={column} rows={rows} />;
  }

  if (filterVariant === "autocomplete") {
    return <AutocompleteTableFilter column={column} rows={rows} />;
  }

  if (filterVariant === "country") {
    return <CountryTableFilter column={column} rows={rows} />;
  }

  return <SelectTableFilter column={column} rows={rows} />;
};

export default TableFilter;
