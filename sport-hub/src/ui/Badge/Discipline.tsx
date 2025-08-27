import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";

interface DisciplineProps {
  variant: Discipline;
  className?: string;
}

const disciplineLabels: Record<Discipline, string> = {
  FREESTYLE_HIGHLINE: "FREESTYLE HIGHLINE",
  RIGGING: "RIGGING",
  SPEED_HIGHLINE: "SPEED HIGHLINE",
  SPEED_SHORT: "SPEED SHORT",
  TRICKLINE: "FREESTYLE TRICKLINE",
};

const Discipline = ({ variant, className = "" }: DisciplineProps) => {
  const variantClass = `discipline${pascalCaseToTitleCase(variant)}`;

  return (
    <div
      className={[
        styles.badge,
        styles[variantClass],
        className
      ].filter(Boolean).join(" ")}
    >
      {disciplineLabels[variant]}
    </div>
  );
};

export default Discipline;
