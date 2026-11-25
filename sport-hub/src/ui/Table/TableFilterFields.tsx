import { Column, Row } from "@tanstack/react-table";
import { Autocomplete, Checkbox, SelectField, TextField } from "@slacklineinternational/onsight/react";
import { COUNTRIES } from "@utils/countries";
import { ContestsGenderDropdown, ContestSizeDropdown, DisciplineDropdown, RecordsGenderDropdown } from "@ui/Form";
import { useEffect, useRef, useState } from "react";
import styles from "./filters.module.css";

type DateRangeFilterValue = { startDate?: string; endDate?: string } | undefined;
type DateRangeRowValue = { startDate?: string; endDate?: string };

type TableFilterProps<TData,> = {
  column: Column<TData, unknown>;
  rows: Row<TData>[];
}

const columnLabel = <TData,>(column: Column<TData, unknown>) => {
  const header = column.columnDef.header;
  return typeof header === "string" && header ? header : column.id;
};

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
  const placeholder = column.columnDef.meta?.filterPlaceholder ?? `Enter ${columnLabel(column).toLowerCase()}`;

  return (
    <TextField
      id={column.id}
      label={columnLabel(column)}
      name={column.id}
      onChange={e => column.setFilterValue(e.target.value || undefined)}
      placeholder={placeholder}
      value={String(column.getFilterValue() || "")}
      type="text"
    />
  );
};

const uniqueOptions = <TData,>(column: Column<TData, unknown>, rows: Row<TData>[]) => {
  const explicit = column.columnDef.meta?.filterOptions;
  if (explicit) return explicit;
  return [...new Set(rows.flatMap(row => {
    const value = row.getValue(column.id);
    return Array.isArray(value) ? value.map(String) : [String(value)];
  }).filter(Boolean))].sort().map(value => ({ value, label: value }));
};

const SelectTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const options = uniqueOptions(column, rows);
  const includeAll = column.columnDef.meta?.filterIncludeAll;

  return (
    <SelectField
      id={column.id}
      label={columnLabel(column)}
      name={column.id}
      onChange={e => column.setFilterValue(e.target.value || undefined)}
      value={String(column.getFilterValue() ?? '')}
    >
      {includeAll && <option value="">All</option>}
      {options.map(({ value, label }) => (<option key={value} value={value}>{label}</option>))}
    </SelectField>
  );
};

/** Filter fn for multi-select columns: the row passes when its value is one of the selected values. */
export const multiSelectFilterFn = <TData,>(
  row: Row<TData>,
  columnId: string,
  filterValue: string[] | undefined,
): boolean => !filterValue?.length || filterValue.includes(String(row.getValue(columnId)));
multiSelectFilterFn.autoRemove = (val: unknown) => !Array.isArray(val) || val.length === 0;

const MultiSelectTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const explicitOptions = column.columnDef.meta?.filterOptions;
  const emptyLabel = column.columnDef.meta?.filterEmptyLabel ?? "All";
  const options = explicitOptions
    ?? [...new Set(rows.map(row => String(row.getValue(column.id))))].sort().map(value => ({ value, label: value }));
  const selected = (column.getFilterValue() as string[] | undefined) ?? [];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = columnLabel(column);
  const labelId = `${column.id}-label`;
  const summary = selected.length === 0 || selected.length === options.length
    ? emptyLabel
    : options.filter((option) => selected.includes(option.value)).map((option) => option.label).join(", ");

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (value: string) => {
    const next = selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value];
    // Keep the options' order so the selection reads the same way as the list
    column.setFilterValue(options.map(option => option.value).filter(item => next.includes(item)));
  };

  return (
    <div className="isa-field" ref={rootRef}>
      <span className="isa-label" id={labelId}>{label}</span>
      <div className="isa-autocomplete">
        <span className="isa-select">
          <button
            aria-expanded={open}
            aria-haspopup="true"
            aria-labelledby={labelId}
            className={`isa-input text-left ${styles.trigger}`}
            id={column.id}
            onClick={() => setOpen((current) => !current)}
            title={summary}
            type="button"
          >
            <span className="block truncate">{summary}</span>
          </button>
        </span>
        <div className={`isa-autocomplete__list ${styles.menu}`} hidden={!open} role="group" aria-label={label}>
          {options.map(({ value, label: optionLabel }) => (
            <Checkbox
              key={value}
              checked={selected.includes(value)}
              label={optionLabel}
              onChange={() => toggle(value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const CountryTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const options: Option[] = [...new Set(rows.map(row => String(row.getValue(column.id))))]
    .reduce((acc, countryIoc) => {
      const { ioc, name } = COUNTRIES.find(c => c.ioc === countryIoc) || {};
      if (ioc && name) acc.push({ value: ioc, label: name });
      return acc;
    }, [] as Option[])
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <SelectField
      id={column.id}
      label={columnLabel(column)}
      name={column.id}
      onChange={e => column.setFilterValue(e.target.value || undefined)}
      value={String(column.getFilterValue() ?? '')}
    >
      <option value="">All</option>
      {options.map(({ value, label }) => (<option key={value} value={value}>{label}</option>))}
    </SelectField>
  );
};

const DateRangeTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const id = column.id;
  const filterValue = (column.getFilterValue() as DateRangeFilterValue) ?? {};
  const { dateFilterShowUpcomingToggle } = column.columnDef?.meta || {};
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);

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

    if (dateFilterShowUpcomingToggle) {
      const dateToday = new Date();
      const isStartDateInTheFuture = new Date(cleaned.startDate || "") >= dateToday;
      const isEndDateInTheFuture = !cleaned.endDate || new Date(cleaned.endDate || "") >= dateToday;
      setShowUpcomingOnly(isStartDateInTheFuture && isEndDateInTheFuture);
    }
  };

  const startField = (
    <TextField
      id={`${id}-start`}
      label="Start date"
      min={minDate}
      onChange={e => update({ startDate: e.target.value || undefined })}
      type="date"
      value={filterValue.startDate ?? ''}
    />
  );
  const endField = (
    <TextField
      id={`${id}-end`}
      label="End date"
      min={minDate}
      onChange={e => update({ endDate: e.target.value || undefined })}
      type="date"
      value={filterValue.endDate ?? ''}
    />
  );

  if (!dateFilterShowUpcomingToggle) {
    return (
      <>
        {startField}
        {endField}
      </>
    );
  }

  return (
    <div className={styles.dateGroup}>
      <div className={styles.dates}>
        {startField}
        {endField}
      </div>
      <div className={styles.upcoming}>
        <Checkbox
          checked={showUpcomingOnly}
          id={`${id}-upcoming`}
          label="Upcoming only"
          onChange={() => {
            const dateToday = (new Date()).toISOString().split("T")[0];
            if (showUpcomingOnly) {
              update({ startDate: undefined, endDate: undefined });
            } else {
              update({ startDate: dateToday, endDate: undefined });
            }
            setShowUpcomingOnly(!showUpcomingOnly);
          }}
        />
      </div>
    </div>
  );
};

const AutocompleteTableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const options = uniqueOptions(column, rows);

  return (
    <Autocomplete
      id={column.id}
      label={columnLabel(column)}
      value={String(column.getFilterValue() ?? '')}
      onChange={(value) => column.setFilterValue(value || undefined)}
      options={options}
      placeholder="All"
    />
  );
};

const DisciplineTableFilter = <TData,>({ column }: TableFilterProps<TData>) => (
  <DisciplineDropdown
    id={column.id}
    includeAll={column.columnDef.meta?.filterIncludeAll}
    onChange={(discipline: string) => {
      column.setFilterValue(!discipline || discipline === "0" ? undefined : discipline);
    }}
  />
);

const ContestGenderTableFilter = <TData,>({ column }: TableFilterProps<TData>) => (
  <ContestsGenderDropdown
    id={column.id}
    value={(column.getFilterValue() as string | undefined) ?? "All"}
    onChange={value => column.setFilterValue(value === "All" ? undefined : value as ContestGender)}
  />
);

const RecordGenderTableFilter = <TData,>({ column }: TableFilterProps<TData>) => (
  <RecordsGenderDropdown
    id={column.id}
    value={(column.getFilterValue() as string | undefined) ?? "All"}
    onChange={value => column.setFilterValue(value === "All" ? undefined : value as ContestGender)}
  />
);

const ContestSizeTableFilter = <TData,>({ column }: TableFilterProps<TData>) => (
  <ContestSizeDropdown
    id={column.id}
    includeAll={column.columnDef.meta?.filterIncludeAll}
    onChange={value => column.setFilterValue(value === "ALL" ? undefined : value as ContestType)}
  />
);

const TableFilter = <TData,>({ column, rows }: TableFilterProps<TData>) => {
  const filterVariant = column.columnDef?.meta?.filterVariant;

  if (filterVariant === "text") return <TextTableFilter column={column} rows={rows} />;
  if (filterVariant === "date-range") return <DateRangeTableFilter column={column} rows={rows} />;
  if (filterVariant === "autocomplete") return <AutocompleteTableFilter column={column} rows={rows} />;
  if (filterVariant === "country") return <CountryTableFilter column={column} rows={rows} />;
  if (filterVariant === "discipline") return <DisciplineTableFilter column={column} rows={rows} />;
  if (filterVariant === "contest-gender") return <ContestGenderTableFilter column={column} rows={rows} />;
  if (filterVariant === "contest-size") return <ContestSizeTableFilter column={column} rows={rows} />;
  if (filterVariant === "multi-select") return <MultiSelectTableFilter column={column} rows={rows} />;
  if (filterVariant === "record-gender") return <RecordGenderTableFilter column={column} rows={rows} />;

  return <SelectTableFilter column={column} rows={rows} />;
};

export default TableFilter;
