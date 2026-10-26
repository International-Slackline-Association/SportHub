import React from "react";
import styles from "./styles.module.css";
import { snakeCaseToPascalCase } from "@utils/strings";
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

  const variantClass = `discipline${snakeCaseToPascalCase(modifiedVariant)}`;

  return (
    <div
      className={[
        styles.badge,
        styles.badgeBold,
        styles[variantClass],
        className,
        styles.test,
      ].filter(Boolean).join(" ")}
    >
      {DISCIPLINE_DATA[modifiedVariant as Discipline]?.name.toUpperCase()}
    </div>
  );
};

export default Discipline;
