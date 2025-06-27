"use client";

import { cn } from "@utils/cn";
import styles from "./styles.module.css";

interface FilterButtonProps {
  label: string;
  color: string;
  textColor: string;
  active: boolean;
  onClick: () => void;
}

export default function FilterButton({
  label,
  color,
  textColor,
  active,
  onClick,
}: FilterButtonProps) {
  return (
    <button
      className={cn(styles.button, active && styles.active)}
      style={{
        backgroundColor: active ? color : 'transparent',
        color: active ? textColor : '#52525B',
        borderColor: color
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
