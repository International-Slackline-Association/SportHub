import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";

interface DisciplineProps {
  variant: string;
  className?: string;
}

const disciplineNumberToName: Record<number, Discipline> = {
  2: "TRICKLINE",
  // 3: "JIBLINE", // deprecated
  5: "FREESTYLE_HIGHLINE",
  7: "SPEED_SHORT",
  8: "SPEED_HIGHLINE",
  11: "RIGGING",
};

const disciplineLabels: Record<Discipline, string> = {
  FREESTYLE_HIGHLINE: "FREESTYLE HIGHLINE",
  RIGGING: "RIGGING",
  SPEED_HIGHLINE: "SPEED HIGHLINE",
  SPEED_SHORT: "SPEED SHORT",
  TRICKLINE: "FREESTYLE TRICKLINE",
};

const Discipline = ({ variant, className = "" }: DisciplineProps) => {
  let modifiedVariant = variant;

  if (Number.isInteger(Number(variant))) {
    modifiedVariant = disciplineNumberToName[Number(variant)] || variant;
  }

  const variantClass = `discipline${pascalCaseToTitleCase(modifiedVariant)}`;

  return (
    <div
      className={[
        styles.badge,
        styles[variantClass],
        className
      ].filter(Boolean).join(" ")}
    >
      {disciplineLabels[modifiedVariant as Discipline]}
    </div>
  );
};

export default Discipline;
