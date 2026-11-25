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
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  Header,
  PaginationState,
  Row,
} from "@tanstack/react-table";
import { useId, useMemo, useState, type ReactNode } from "react";
import { SelectField, Table as DataTable } from "@slacklineinternational/onsight/react";
import { TableFilters } from "./TableFilters";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: "text" | "select" | "date-range" | "autocomplete" | "country" | "discipline" | "contest-gender" | "contest-size" | "record-gender" | "multi-select";
    /** Explicit options for select filters. When provided, overrides data-derived options. */
    filterOptions?: { value: string; label: string }[];
    /** Custom placeholder text for text filters. */
    filterPlaceholder?: string;
    /** multi-select only: summary shown when nothing is selected. Defaults to "All". */
    filterEmptyLabel?: string;
    /** When true, includes the "All" option in select filters. */
    filterIncludeAll?: boolean;
    /** When true, renders a checkbox to filter for future dates. */
    dateFilterShowUpcomingToggle?: boolean;
    /** Optional class on the filter control (e.g. flex grow for a text filter). */
    filterClassName?: string;
  }
}

export type RowClassContext<TData> = {
  row: Row<TData>;
  index: number;
  rows: Row<TData>[];
  allRows: Row<TData>[];
  globalIndex: number;
};

type TableColumn = {
  key: string;
  header: ReactNode;
  sortable?: boolean;
  rowHeader?: boolean;
  render: (rowIndex: number) => ReactNode;
};

type TableProps<TData,> = {
  extraFilters?: React.ReactNode;
  options: Partial<TableOptions<TData>>;
  /** Visible caption. Leave empty to name the table for screen readers only. */
  title?: string;
  /** Accessible name when there is no visible title. */
  label?: string;
  /**
   * Class for each body row. Onsight's Table cannot class a row, so a table
   * that sets this is drawn with the isa-table markup instead.
   */
  rowClassName?: (context: RowClassContext<TData>) => string | undefined;
};

const PAGE_SIZES = [10, 50, 100, 1000];

/** Same page list as Onsight. The package entry does not export pageList. */
function pageList(page: number, pageCount: number, siblings = 1): Array<number | null> {
  const wanted = new Set([1, pageCount]);
  for (let p = page - siblings; p <= page + siblings; p++) if (p >= 1 && p <= pageCount) wanted.add(p);
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0) {
      const gap = p - sorted[i - 1];
      if (gap === 2) out.push(p - 1);
      else if (gap > 2) out.push(null);
    }
    out.push(p);
  });
  return out;
}

function PageIcon({ d }: { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/**
 * Onsight Pagination renders nothing when every row fits on one page, which
 * makes the footer jump. This copy stays on screen and disables both directions.
 */
function TablePagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  const count = Math.max(pageCount, 1);
  const current = pageCount < 1 ? 1 : page;
  const item = (target: number, label: string, children: ReactNode, key: string | number) => (
    <li key={key}>
      <button
        aria-current={target === current && target >= 1 && target <= count ? "page" : undefined}
        aria-label={label}
        className="isa-pagination__item"
        disabled={target < 1 || target > count || undefined}
        onClick={() => onPageChange(target)}
        type="button"
      >
        {children}
      </button>
    </li>
  );

  return (
    <nav aria-label="Pagination" className="isa-pagination">
      <ul className="isa-pagination__list">
        {item(current - 1, "Previous page", <><PageIcon d="M15 6l-6 6 6 6" /><span className="isa-pagination__word">Previous</span></>, "prev")}
        {pageList(current, count).map((p, i) => (
          p === null
            ? <li key={`gap-${i}`}><span aria-hidden className="isa-pagination__gap">…</span></li>
            : item(p, `Page ${p}`, String(p), p)
        ))}
        {item(current + 1, "Next page", <><span className="isa-pagination__word">Next</span><PageIcon d="M9 6l6 6-6 6" /></>, "next")}
      </ul>
    </nav>
  );
}

function SortIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

function ClassedTable<TData>({
  columns,
  label,
  onSortChange,
  rowClassName,
  rows,
  sort,
  title,
  visibleRows,
  allRows,
}: {
  columns: TableColumn[];
  label: string;
  onSortChange: (next: { key: string; direction: "ascending" | "descending" }) => void;
  rowClassName: (context: RowClassContext<TData>) => string | undefined;
  rows: TData[];
  sort?: { key: string; direction: "ascending" | "descending" };
  title?: string;
  visibleRows: Row<TData>[];
  allRows: Row<TData>[];
}) {
  const captionId = useId();
  return (
    <div
      aria-label={title ? undefined : label}
      aria-labelledby={title ? captionId : undefined}
      className="isa-table-wrap"
      role="region"
      tabIndex={0}
    >
      <table className="isa-table isa-table--sticky-first">
        {title ? <caption id={captionId}>{title}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => {
              const sorted = sort?.key === column.key ? sort.direction : "none";
              return (
                <th aria-sort={column.sortable ? sorted : undefined} key={column.key} scope="col">
                  {column.sortable ? (
                    <button
                      className="isa-table__sort"
                      onClick={() => onSortChange({
                        key: column.key,
                        direction: sort?.key === column.key && sort.direction === "ascending" ? "descending" : "ascending",
                      })}
                      type="button"
                    >
                      {column.header}
                      <SortIcon />
                    </button>
                  ) : column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((_row, index) => {
            const row = visibleRows[index];
            const globalIndex = allRows.findIndex((item) => item.id === row?.id);
            const className = row
              ? rowClassName({ row, index, rows: visibleRows, allRows, globalIndex })
              : undefined;
            return (
              <tr className={className} key={row?.id ?? index}>
                {columns.map((column) => (
                  column.rowHeader
                    ? <th key={column.key} scope="row">{column.render(index)}</th>
                    : <td key={column.key}>{column.render(index)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const Table = <TData,>({ extraFilters, options, title, label = "Table", rowClassName }: TableProps<TData>) => {
  const pageSizeId = useId();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    options?.initialState?.columnFilters ?? []
  );
  const [sorting, setSorting] = useState<SortingState>(options?.initialState?.sorting ?? []);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: options?.initialState?.pagination?.pageIndex ?? 0,
    pageSize: options?.initialState?.pagination?.pageSize ?? 10,
  });

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
      // Empty values show a dash
      cell: info => {
        const value = info.renderValue();
        return value === null || value === undefined || value === '' ? '—' : String(value);
      },
      size: undefined,
    },
    state: {
      columnFilters,
      sorting,
      pagination,
      columnVisibility: autoColumnVisibility,
      ...(options?.initialState?.columnOrder && { columnOrder: options.initialState.columnOrder }),
    },
    ...options,
    columns: options?.columns || [],
    data: options?.data || [],
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const allRows = table.getPrePaginationRowModel().rows;
  const headers = table.getHeaderGroups().at(-1)?.headers ?? [];
  const headerByColumn = new Map<string, Header<TData, unknown>>(headers.map((header) => [header.column.id, header]));
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const total = table.getFilteredRowModel().rows.length;
  const from = total === 0 ? 0 : Math.min(pageIndex * pageSize + 1, total);
  const to = Math.min((pageIndex + 1) * pageSize, total);
  const pageSizes = PAGE_SIZES.includes(pageSize) ? PAGE_SIZES : [...PAGE_SIZES, pageSize].sort((a, b) => a - b);
  const columns: TableColumn[] = table.getVisibleLeafColumns().map((column, index) => {
    const header = headerByColumn.get(column.id);
    return {
      key: column.id,
      header: header && !header.isPlaceholder
        ? flexRender(header.column.columnDef.header, header.getContext())
        : null,
      sortable: column.getCanSort(),
      rowHeader: index === 0,
      render: (rowIndex: number) => {
        const cell = visibleRows[rowIndex]?.getVisibleCells().find((item) => item.column.id === column.id);
        return cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null;
      },
    };
  });
  const sort = sorting[0] ? { key: sorting[0].id, direction: sorting[0].desc ? "descending" as const : "ascending" as const } : undefined;
  const onSortChange = (next: { key: string; direction: "ascending" | "descending" }) => {
    table.setSorting([{ id: next.key, desc: next.direction === "descending" }]);
  };
  const rows = visibleRows.map((row) => row.original);

  return (
    <div className="w-full min-w-0 flex flex-col gap-4">
      <TableFilters extraFilters={extraFilters} table={table} label={title ? `Filter ${title}` : "Filter the table"} />
      {rowClassName ? (
        <ClassedTable
          allRows={allRows}
          columns={columns}
          label={label}
          onSortChange={onSortChange}
          rowClassName={rowClassName}
          rows={rows}
          sort={sort}
          title={title}
          visibleRows={visibleRows}
        />
      ) : (
        <DataTable
          aria-label={title ? undefined : label}
          caption={title}
          columns={columns.map((column) => ({
            ...column,
            render: (_row: TData, rowIndex: number) => column.render(rowIndex),
          }))}
          onSortChange={onSortChange}
          rowKey={(_row, index) => visibleRows[index]?.id ?? index}
          rows={rows}
          sort={sort}
          stickyFirst
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="isa-help m-0 flex items-center" style={{ minHeight: "var(--isa-size-touch-target)" }}>
          Showing {from} to {to} of {total}
        </p>
        <div className="w-40">
          <SelectField
            id={pageSizeId}
            label="Rows per page"
            value={String(pageSize)}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </SelectField>
        </div>
        <TablePagination
          onPageChange={(page) => table.setPageIndex(page - 1)}
          page={pageIndex + 1}
          pageCount={table.getPageCount()}
        />
      </div>
    </div>
  );
};

export default Table;
