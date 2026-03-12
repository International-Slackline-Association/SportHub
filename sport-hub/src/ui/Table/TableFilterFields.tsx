import { Header, Row } from "@tanstack/react-table";
import styles from "./styles.module.css";

type TableFilterProps<TData,> = {
  header: Header<TData, unknown>;
  rows: Row<TData>[];
}

const TextTableFilter = <TData,>({ header }: TableFilterProps<TData>) => {
  const { id, column } = header;
  const columnName = column.columnDef?.header?.toString() || "";

  return (
    <div className={styles.columnFilter} key={`column-filter-${id}`}>
      <label htmlFor={id}>{columnName}</label>
      <input
        id={id}
        name={columnName}
        onChange={e => column.setFilterValue(e.target.value || undefined)}
        placeholder="Enter event name"
        value={String(column.getFilterValue() || "")}
        type="text"
      />
    </div>
  );
};

const SelectTableFilter = <TData,>({ header, rows }: TableFilterProps<TData>) => {
  const { id, column } = header;
  const columnName = column.columnDef.header?.toString();
  const explicitOptions = column.columnDef.meta?.filterOptions;

  // Use explicit options when provided (e.g. full discipline/size lists from consts).
  // Otherwise derive unique values from the current data rows.
  const options: { value: string; label: string }[] = explicitOptions
    ?? [...new Set(rows.map(row => String(row.getValue(column.id))))].map(v => ({ value: v, label: v }));

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

const TableFilter = <TData,>({ header, rows }: TableFilterProps<TData>) => {
  const filterVariant = header.column.columnDef?.meta?.filterVariant;

  if (filterVariant === "text") {
    return <TextTableFilter header={header} rows={rows} />;
  }

  return <SelectTableFilter header={header} rows={rows} />;
};

export default TableFilter;
