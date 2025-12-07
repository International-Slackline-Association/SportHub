import { cn } from "@utils/cn";
import styles from "./styles.module.css";

type ChevronIconProps = {
  color?: "dark" | "light";
  direction: "up" | "down";
}

export const ChevronIcon = ({ color = "light", direction }: ChevronIconProps) => (
  <svg
    className={cn(styles.chevron, direction === "up" && styles.chevronOpen, color === "light" ? styles.chevronLight : styles.chevronDark)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);