import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";

export type ContestSizeVariant = ContestType;

interface ContestSizeProps {
  variant: ContestSizeVariant;
  className?: string;
}

const contestSizeLabels: Record<ContestSizeVariant, string> = {
  WORLD_CHAMPIONSHIP: "WORLD CHAMPIONSHIP",
  WORLD_CUP: "WORLD CUP",
  MASTERS: "MASTERS",
  GRAND_SLAM: "GRAND SLAM",
  OPEN: "OPEN",
  CHALLENGE: "CHALLENGE",
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
