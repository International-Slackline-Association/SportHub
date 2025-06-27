"use client";

import { Table } from "@tanstack/react-table";
import styles from "./styles.module.css";
import TableFilterFields from "./TableFilterFields";
import { useClientMediaQuery } from "@utils/useClientMediaQuery";
import { useState } from "react";
import Drawer from "@ui/Drawer";
import Button from "@ui/Button";

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
      <div className="cluster">
        {
          ...filterableHeaders.map((header) => (
            <TableFilterFields header={header} key={header.id} rows={prefilteredRows} />
          ))
        }
        <Button className={styles.resetButton} onClick={() => table.resetColumnFilters()} variant="secondary">Reset</Button>
      </div>
    );
  }

  return (
    <div className="cluster">
      <Button
        aria-expanded={menuOpen}
        aria-controls="filter-menu"
        aria-label="Open table filter menu"
        onClick={() => setMenuOpen(true)}
        variant="primary"
      >
        Show Filters
      </Button>
      <Drawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} position="right">
        <div className="stack p-4 gap-4">
          <span className="text-white text-3xl">Filters</span>
          <div className="my-4">
            {
              ...filterableHeaders.map((header) => (
                <TableFilterFields header={header} key={header.id} rows={prefilteredRows} />
              ))
            }
          </div>
          <Button onClick={() => table.resetColumnFilters()} variant="ghost">Reset Filters</Button>
          <Button
            aria-expanded={menuOpen}
            aria-controls="filter-menu"
            aria-label="Close table filter menu"
            onClick={() => setMenuOpen(false)}
            variant="secondary"
          >
            Close Filters
          </Button>
        </div>
      </Drawer>
    </div>
  );
};