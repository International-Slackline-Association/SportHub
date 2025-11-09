import { Header, Row } from "@tanstack/react-table";
import styles from "./styles.module.css";

type TableFilterProps<TData,> = {
  header: Header<TData, unknown>;
  rows: Row<TData>[];
}

const getColumnName = <TData,>(header: Header<TData, unknown>) =>
  header.column.columnDef.header?.toString() || header.column.columnDef.id || "";

const TextTableFilter = <TData,>({ header }: TableFilterProps<TData>) => {
  const { id, column } = header;
  const columnName = getColumnName(header);

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
  const columnName = getColumnName(header);

  // Casts option values to string to stay synced with filter table state.
  // Columns with non-string data will need to cast to string in order for filtering to work.
  const options = [...new Set(rows.map(row => String(row.getValue(column.id))))].filter(
    option => option !== undefined
  );

  return (
    <div className={styles.columnFilter} key={`column-filter-${id}`}>
      <label htmlFor={id}>{columnName}</label>
      <select
        id={id}
        name={columnName}
        onChange={e => column.setFilterValue(e.target.value || undefined)}
        value={String(column.getFilterValue())}
      >
        <option value={""}>Select</option>
        {...options.map(value => (<option key={value} value={value}>{value}</option>))}
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
