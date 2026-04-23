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
  Row,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import styles from "./styles.module.css";
import { TableFilters } from "./TableFilters";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: "text" | "select" | "date" | "autocomplete";
    /** Explicit options for select filters. When provided, overrides data-derived options. */
    filterOptions?: { value: string; label: string }[];
    /** Custom placeholder text for text filters. */
    filterPlaceholder?: string;
    /** When true, hides the blank "All" option in select filters. */
    filterNoAll?: boolean;
  }
}

export type RowClassContext<TData> = {
  row: Row<TData>;
  index: number;
  rows: Row<TData>[];
  allRows: Row<TData>[];
  globalIndex: number;
};

type TableProps<TData,> = {
  extraFilters?: React.ReactNode;
  options: Partial<TableOptions<TData>>;
  title?: string;
  rowClassName?: (context: RowClassContext<TData>) => string | undefined;
};

const Table = <TData,>({ extraFilters, options, title, rowClassName }: TableProps<TData>) => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    options?.initialState?.columnFilters ?? []
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  // Automatically hide columns declared with size: 0 (used for filter-only columns)
  const autoColumnVisibility = useMemo<VisibilityState>(() => {
    const hidden: VisibilityState = {};
    for (const col of options?.columns ?? []) {
      if (col.size === 0) {
        const id =
          (col as { id?: string }).id ??
          (col as { accessorKey?: unknown }).accessorKey as string | undefined;
        if (id) hidden[id] = false;
      }
    }
    return { ...hidden, ...options?.initialState?.columnVisibility };
  }, [options?.columns, options?.initialState?.columnVisibility]);

  const table = useReactTable({
    defaultColumn: {
      enableColumnFilter: false,
    },
    initialState: {
      columnFilters,
      pagination: {
        pageSize: 10, // Default to 10 items per page
      },
    },
    state: {
      columnFilters,
      sorting,
      columnVisibility: autoColumnVisibility,
      ...(options?.initialState?.columnOrder && { columnOrder: options.initialState.columnOrder }),
    },
    ...options,
    columns: options?.columns || [],
    data: options?.data || [],
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const allRows = table.getPrePaginationRowModel().rows;

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableTitle}>
        {title && <h3>{title}</h3>}
        <TableFilters extraFilters={extraFilters} table={table} />
      </div>
      <div className={styles.tableWrapper}>
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: `${header.getSize()}px` }}
                    className={header.column.getCanSort() ? styles.sortableHeader : undefined}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder ? null : (
                      <div className={styles.headerContent}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className={styles.sortIndicator}>
                            {header.column.getIsSorted() === 'asc'
                              ? '↑'
                              : header.column.getIsSorted() === 'desc'
                              ? '↓'
                              : '↕'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.map((row, index, rows) => (
                <tr key={row.id} className={rowClassName?.({ row, index, rows, allRows, globalIndex: allRows.findIndex(r => r.id === row.id) })}>
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

      {/* Pagination Controls */}
      <div className={styles.paginationContainer}>
        <div className={styles.paginationInfo}>
          <span>
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of{' '}
            {table.getFilteredRowModel().rows.length} entries
          </span>
        </div>

        <div className={styles.paginationControls}>
          <div className={styles.pageSizeSelector}>
            <label htmlFor="pageSize">Show:</label>
            <select
              id="pageSize"
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value))
              }}
            >
              {[10, 50, 100, 1000].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className={styles.pageNavigation}>
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className={styles.pageButton}
            >
              {'<<'}
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={styles.pageButton}
            >
              {'<'}
            </button>

            <div className={styles.pageNumbers}>
              {(() => {
                const currentPage = table.getState().pagination.pageIndex;
                const totalPages = table.getPageCount();
                const pages = [];

                // Show up to 5 page numbers around the current page
                const startPage = Math.max(0, currentPage - 2);
                const endPage = Math.min(totalPages - 1, currentPage + 2);

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => table.setPageIndex(i)}
                      className={`${styles.pageButton} ${i === currentPage ? styles.activePageButton : ''}`}
                    >
                      {i + 1}
                    </button>
                  );
                }
                return pages;
              })()}
            </div>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={styles.pageButton}
            >
              {'>'}
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className={styles.pageButton}
            >
              {'>>'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Table;
