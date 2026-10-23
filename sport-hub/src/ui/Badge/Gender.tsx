import React from "react";
import styles from "./styles.module.css";
import { normalizeGender } from "@utils/gender";
import { cn } from "@utils/cn";
import { snakeCaseToPascalCase, textToTitleCase } from "@utils/strings";
import { FemaleIcon, MaleIcon } from "@ui/Icons";

interface GenderProps {
  className?: string;
  color?: "gray" | "neutral";
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "normal" | "bold";
  value: Gender | ContestGender | string | undefined;
}

const Gender = ({
  className = "",
  color = "neutral",
  showIcon = true,
  variant = "bold",
  value
}: GenderProps) => {
  const genderClass = `gender${snakeCaseToPascalCase(value || "")}`;
  const normalizedGender = normalizeGender(value) || "";
  const includeFemaleIcon = normalizedGender === "WOMEN" || normalizedGender === "MIXED";
  const includeMaleIcon = normalizedGender === "MEN" || normalizedGender === "MIXED";
  const colorClass = color === "gray" ? styles.genderGray : "";
  const typographyClass = variant === "normal" ? '' : styles.badgeBold;

  return (
    <div
      className={cn(
        styles.badge,
        colorClass,
        typographyClass,
        styles.gender,
        styles[genderClass],
        className
      )}
    >
      {showIcon && includeFemaleIcon && <FemaleIcon />}
      {showIcon && includeMaleIcon && <MaleIcon />}
      {textToTitleCase(normalizedGender)}
    </div>
  );
};

export default Gender;
