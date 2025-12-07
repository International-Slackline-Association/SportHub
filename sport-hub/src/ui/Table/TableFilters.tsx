"use client";

import { Table } from "@tanstack/react-table";
import styles from "./styles.module.css";
import TableFilterFields from "./TableFilterFields";
import { useClientMediaQuery } from "@utils/useClientMediaQuery";
import { useState } from "react";
import Button from "@ui/Button";
import { cn } from "@utils/cn";

const FilterIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 118 118"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14.75 34.4167H29.5"
      stroke="currentColor"
      strokeWidth="8.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.75 83.5833H44.25"
      stroke="currentColor"
      strokeWidth="8.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M88.5 83.5833H103.25"
      stroke="currentColor"
      strokeWidth="8.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M73.75 34.4167H103.25"
      stroke="currentColor"
      strokeWidth="8.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M29.5 34.4167C29.5 29.8349 29.5 27.544 30.2485 25.7369C31.2465 23.3275 33.1609 21.4132 35.5703 20.4152C37.3774 19.6667 39.6683 19.6667 44.25 19.6667C48.8317 19.6667 51.1225 19.6667 52.9299 20.4152C55.339 21.4132 57.2536 23.3275 58.2517 25.7369C59 27.544 59 29.8349 59 34.4167C59 38.9984 59 41.2893 58.2517 43.0964C57.2536 45.5058 55.339 47.4201 52.9299 48.4182C51.1225 49.1667 48.8317 49.1667 44.25 49.1667C39.6683 49.1667 37.3774 49.1667 35.5703 48.4182C33.1609 47.4201 31.2465 45.5058 30.2485 43.0964C29.5 41.2893 29.5 38.9984 29.5 34.4167Z"
      stroke="currentColor"
      strokeWidth="8.5"
    />
    <path
      d="M59 83.5833C59 79.0015 59 76.7108 59.7483 74.9035C60.7464 72.4943 62.661 70.5797 65.0701 69.5817C66.8775 68.8333 69.1682 68.8333 73.75 68.8333C78.3318 68.8333 80.6225 68.8333 82.4299 69.5817C84.839 70.5797 86.7536 72.4943 87.7517 74.9035C88.5 76.7108 88.5 79.0015 88.5 83.5833C88.5 88.1652 88.5 90.4559 87.7517 92.2632C86.7536 94.6724 84.839 96.5869 82.4299 97.585C80.6225 98.3333 78.3318 98.3333 73.75 98.3333C69.1682 98.3333 66.8775 98.3333 65.0701 97.585C62.661 96.5869 60.7464 94.6724 59.7483 92.2632C59 90.4559 59 88.1652 59 83.5833Z"
      stroke="currentColor"
      strokeWidth="8.5"
    />
  </svg>
);

type TableFiltersProps<TData,> = {
  table: Table<TData>;
};

export const TableFilters = <TData,>({ table }: TableFiltersProps<TData>) => {
  const { isDesktop } = useClientMediaQuery();
  const [menuOpen, setMenuOpen] = useState(false);

  const filterableHeaders = table.getFlatHeaders().filter(header => header.column.getCanFilter());
  const prefilteredRows = table.getPreFilteredRowModel().rows;

  if (!filterableHeaders.length) return null;

  if (isDesktop) {
    return (
      <div className={cn(styles.tableFilters, "cluster")}>
        {
          ...filterableHeaders.map((header) => (
            <TableFilterFields header={header} key={header.id} rows={prefilteredRows} />
          ))
        }
        <Button className={styles.resetButton} onClick={() => table.resetColumnFilters()} variant="ghost">Reset</Button>
      </div>
    );
  }

  return (
    <>
      <Button
        aria-expanded={menuOpen}
        aria-controls="filter-menu"
        aria-label="Open filter menu"
        className={cn(!menuOpen && "mb-2")}
        onClick={() => setMenuOpen(!menuOpen)}
        variant="secondary"
      >
        <FilterIcon className={styles.filterIcon} />
        <span className="pl-2">{menuOpen ? "Hide Filters" : "Show Filters"}</span>
      </Button>
      <div className={[styles.tableFilters, "py-4", menuOpen && styles.accordionOpen, !menuOpen && styles.accordionClose].filter(Boolean).join(" ")}>
        <div className={cn(styles.tableFilters, "stack")}>
          {
            ...filterableHeaders.map((header) => (
              <TableFilterFields header={header} key={header.id} rows={prefilteredRows} />
            ))
          }
        </div>
        <Button className={styles.resetButton} onClick={() => table.resetColumnFilters()} variant="ghost">Reset</Button>
      </div>
    </>
  );
};