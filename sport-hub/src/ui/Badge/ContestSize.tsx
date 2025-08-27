import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";

export type ContestSizeVariant = "MASTERS" | "OPEN" | "GRAND_SLAM" | "WORLD_CUP" | "WORLD_CHAMPIONSHIP";

interface ContestSizeProps {
  variant: ContestSizeVariant;
  className?: string;
}

const contestSizeLabels: Record<ContestSizeVariant, string> = {
  GRAND_SLAM: "GRAND SLAM",
  MASTERS: "MASTERS",
  OPEN: "OPEN",
  WORLD_CUP: "WORLD CUP",
  WORLD_CHAMPIONSHIP: "WORLD CHAMPIONSHIP"
};

const ContestSize = ({ variant, className = "" }: ContestSizeProps) => {
  const variantClass = `contestSize${pascalCaseToTitleCase(variant)}`;

  return (
    <div
      className={[
        styles.badge,
        styles.contestSize,
        styles[variantClass],
        className
      ].filter(Boolean).join(" ")}
    >
      <div className={styles.dot} />
      {contestSizeLabels[variant]}
    </div>
  );
};

export default ContestSize;
