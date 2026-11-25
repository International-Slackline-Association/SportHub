"use client";

import { Table } from "@tanstack/react-table";
import { Filters } from '@slacklineinternational/onsight/react';
import TableFilterFields from "./TableFilterFields";
import { cn } from "@utils/cn";
import styles from "./filters.module.css";

type TableFiltersProps<TData,> = {
  extraFilters?: React.ReactNode;
  table: Table<TData>;
  /** Name of the group for screen readers. */
  label?: string;
};

export const TableFilters = <TData,>({ extraFilters, table, label = "Filter the table" }: TableFiltersProps<TData>) => {
  const filterableColumns = table.getAllFlatColumns().filter(col => col.getCanFilter());
  const prefilteredRows = table.getPreFilteredRowModel().rows;

  if (!filterableColumns.length && !extraFilters) return null;

  const reserveUpcoming = table.getAllColumns().some((col) => col.columnDef.meta?.dateFilterShowUpcomingToggle);

  return (
    <Filters
      className={cn(styles.filterRow, reserveUpcoming && styles.withUpcoming)}
      label={label}
      activeCount={table.getState().columnFilters.length}
      onReset={() => table.resetColumnFilters()}
    >
      {extraFilters}
      {filterableColumns.map((col) => (
        <TableFilterFields column={col} key={col.id} rows={prefilteredRows} />
      ))}
    </Filters>
  );
};
