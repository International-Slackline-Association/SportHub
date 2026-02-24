import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";

interface AgeCategoryProps {
  variant: AgeCategory;
  className?: string;
}

const ageCategoryLabels: Record<AgeCategory, string> = {
  ALL: "All",
  YOUTH: "Youth",
  SENIOR: "Senior",
};

const AgeCategory = ({ variant, className = "" }: AgeCategoryProps) => {
  const variantClass = `age${pascalCaseToTitleCase(variant)}`;

  return (
    <div
      className={[
        styles.badge,
        styles[variantClass],
        className
      ].filter(Boolean).join(" ")}
    >
      {ageCategoryLabels[variant]}
    </div>
  );
};

export default AgeCategory;
