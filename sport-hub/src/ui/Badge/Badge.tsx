import React from "react";
import styles from "./styles.module.css";

export type BadgeColor = "NEUTRAL" | "BLUE" | "GREEN" | "ORANGE" | "PINK" | "RED" | "TEAL" | "VIOLET" | "YELLOW" | "PURPLE";

interface BadgeProps {
  color: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

const Badge = ({ color, children, className = "" }: BadgeProps) => {
  const colorClass = `badge${color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()}`;

  return (
    <div
      className={[
        styles.badge,
        styles[colorClass],
        className
      ].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
};

export default Badge;
