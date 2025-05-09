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
import TableFilter from "./TableFilter";

 declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: "text" | "select";
  }
}

type TableProps<TData,> = {
  options: Partial<TableOptions<TData>>;
};

const Table = <TData,>({ options }: TableProps<TData>) => {
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

  const filterableHeaders = table.getFlatHeaders().filter(header => header.column.getCanFilter());
  const prefilteredRows = table.getPreFilteredRowModel().rows;
  
  return (
    <div>
      {filterableHeaders.length ? ( 
        <div className="column-filter-wrapper">
          {
            ...filterableHeaders.map((header) => (
              <TableFilter header={header} key={header.id} rows={prefilteredRows} />
            ))
          }
          <button className="filter-reset-button" onClick={() => table.resetColumnFilters()}>Reset</button>
        </div>
      ) : null}
      <div className="table-wrapper">
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
