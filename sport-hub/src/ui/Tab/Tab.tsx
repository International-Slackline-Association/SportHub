import React from "react";
import Button from "../Button";
import styles from "./styles.module.css";

export type TabVariant = "primary" | "secondary" | "large";

interface TabProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  variant?: TabVariant;
  className?: string;
}

const Tab = ({ 
  children, 
  isActive = false, 
  onClick, 
  variant = "primary",
  className = "" 
}: TabProps) => {
  return (
    <Button
      variant="tab"
      className={[
        styles.tabItem,
        styles[variant],
        isActive ? styles.active : "",
        className
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      type="button"
    >
      {children}
    </Button>
  );
};

export default Tab;