import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";
import { DISCIPLINE_DATA, MAP_DISCIPLINE_ENUM_TO_NAME } from "@utils/consts";

interface DisciplineProps {
  variant: string;
  className?: string;
}

const Discipline = ({ variant, className = "" }: DisciplineProps) => {
  let modifiedVariant = variant;

  if (Number.isInteger(Number(variant))) {
    modifiedVariant = MAP_DISCIPLINE_ENUM_TO_NAME[Number(variant)] || variant;
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
      {DISCIPLINE_DATA[modifiedVariant as Discipline]?.name.toUpperCase()}
    </div>
  );
};

export default Discipline;
