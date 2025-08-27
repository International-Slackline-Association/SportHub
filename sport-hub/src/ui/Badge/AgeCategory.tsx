import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";

interface AgeCategoryProps {
  variant: AgeCategory;
  className?: string;
}

const ageCategoryLabels: Record<AgeCategory, string> = {
  AMATEUR: "Amateur",
  PROFESSIONAL: "pro (17-35)",
  SENIOR: "Senior",
  YOUTH_U14: "Youth u14",
  YOUTH_U16: "youth u16",
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
