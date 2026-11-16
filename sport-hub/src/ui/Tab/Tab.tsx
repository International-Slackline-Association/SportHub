import React from "react";
import styles from "./styles.module.css";

export type TabVariant = "primary" | "secondary" | "large";

interface TabProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  variant?: TabVariant;
}

const Tab = ({
  children,
  className = "",
  disabled = false,
  isActive = false,
  onClick,
  variant = "primary",
}: TabProps) => {
  return (
    <button
      className={[
        styles.tabItem,
        styles[variant],
        isActive ? styles.active : "",
        className
      ].filter(Boolean).join(" ")}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

export default Tab;