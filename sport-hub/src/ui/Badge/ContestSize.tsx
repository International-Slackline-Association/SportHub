import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";
import { TrophyIcon } from "@ui/Icons";
import { cn } from "@utils/cn";
import { getContestSizeTrophyCount } from "@utils/contestSize";
import { snakeCaseToTitleCase } from "@utils/strings";

interface ContestSizeProps {
  className?: string;
  showIcon?: boolean;
  singleIcon?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "normal" | "bold";
  value: ContestType | undefined;
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
  if (!value) {
    return null;
  }

  const variantClass = `contestSize${pascalCaseToTitleCase(value || "")}`;
  const numTrophies = singleIcon ? 1 : getContestSizeTrophyCount(value);
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
        className
      )}
    >
      {showIcon && numTrophies > 0 && (
        <span className="flex flex-row">
          {Array(numTrophies).fill("").map((_, idx) => (
            <TrophyIcon key={`trophy-${idx}`} size={TROPHY_SIZES[size]} />
          ))}
        </span>
      )}
      {snakeCaseToTitleCase(value)}
    </div>
  );
};

export default ContestSize;
