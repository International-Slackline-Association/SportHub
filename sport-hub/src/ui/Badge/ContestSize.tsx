import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";

export type ContestSizeVariant = ContestType;

interface ContestSizeProps {
  variant: ContestSizeVariant;
  className?: string;
}

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
      {variant.replaceAll("_", " ")}
    </div>
  );
};

export default ContestSize;
