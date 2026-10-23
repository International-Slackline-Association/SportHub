import React from "react";
import styles from "./styles.module.css";
import { TrophyIcon } from "@ui/Icons";
import { cn } from "@utils/cn";
import { snakeCaseToPascalCase, snakeCaseToTitleCase } from "@utils/strings";
import { contestSizeOptions } from "@ui/Form/commonOptions";
import { MAP_CONTEST_TYPE_ENUM_TO_NAME } from "@utils/consts";

const getContestSizeOption = (
  value: number | string | null | undefined,
): Option<ContestType> | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  let contestSize;
  if (Number.isInteger(value)) {
    contestSize = MAP_CONTEST_TYPE_ENUM_TO_NAME[value as number];
  } else {
    contestSize = String(value).trim().toUpperCase().replace(/\s+/g, '_');
  }

  return contestSizeOptions.find(({ value }) => value === contestSize);
};

const getContestSizeTrophyCount = (contestSize: ContestType) =>
  contestSizeOptions.findIndex(({ value }) => value === contestSize) + 1;


interface ContestSizeProps {
  className?: string;
  showIcon?: boolean;
  singleIcon?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "normal" | "bold";
  value: ContestType | string | undefined;
}

const TROPHY_SIZES = { sm: 12, md: 16, lg: 20 };

const ContestSize = ({
  className = "",
  showIcon = true,
  size = "md",
  singleIcon = false,
  variant = "bold",
  value,
}: ContestSizeProps) => {
  const contestSizeOption = getContestSizeOption(value);

  if (!contestSizeOption) {
    return null;
  }

  const variantClass = `contestSize${snakeCaseToPascalCase(value || "")}`;
  const numTrophies = singleIcon ? 1 : getContestSizeTrophyCount(contestSizeOption.value);
  const typographyClass = variant === "normal" ? "" : styles.badgeBold;
  const boxedClass = variant === "bold" ? styles.contestSizeBordered : "";

  return (
    <div
      className={cn(
        styles.badge,
        styles.contestSize,
        boxedClass,
        typographyClass,
        styles[variantClass],
        className,
      )}
    >
      {showIcon && numTrophies > 0 && (
        <span className="flex flex-row">
          {Array(numTrophies).fill("").map((_, idx) => (
            <TrophyIcon key={`trophy-${idx}`} size={TROPHY_SIZES[size]} />
          ))}
        </span>
      )}
      {snakeCaseToTitleCase(contestSizeOption.label)}
    </div>
  );
};

export default ContestSize;
