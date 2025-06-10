"use client"

import { 
   useReactTable,
   getCoreRowModel,
   getPaginationRowModel,
   getSortedRowModel,
   getFilteredRowModel,
   TableOptions,
   flexRender,
   RowData,
   ColumnFiltersState
 } from "@tanstack/react-table";
import { useState } from "react";
import styles from "./styles.module.css";
import { TableFilters } from "./TableFilters";

 declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: "text" | "select";
  }
}

type TableProps<TData,> = {
  options: Partial<TableOptions<TData>>;
  title?: string;
};

const Table = <TData,>({ options, title }: TableProps<TData>) => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    defaultColumn: {
      enableColumnFilter: false,
    },
    initialState: {
      columnFilters,
    },
    state: {
      columnFilters,
    },
    ...options,
    columns: options?.columns || [],
    data: options?.data || [],
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableTitle}>
        {title && <h3>{title}</h3>}
        <TableFilters table={table} />
      </div>
      <div className={styles.tableWrapper}>
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getFilteredRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
