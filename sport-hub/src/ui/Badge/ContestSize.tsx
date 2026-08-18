import React from "react";
import styles from "./styles.module.css";
import { pascalCaseToTitleCase } from ".";
import { TrophyIcon } from "@ui/Icons";

export type ContestSizeVariant = ContestType;

interface ContestSizeProps {
  variant: ContestSizeVariant;
  className?: string;
}

// Lowest to highest
const CONTEST_TIERS = [
  "CHALLENGE",
  "OPEN",
  "GRAND_SLAM",
  "MASTERS",
  "WORLD_CUP",
  "WORLD_CHAMPIONSHIP",
];

const ContestSize = ({ variant, className = "" }: ContestSizeProps) => {
  const variantClass = `contestSize${pascalCaseToTitleCase(variant)}`;
  const numTrophies = CONTEST_TIERS.indexOf(variant) + 1;
  
  return (
    <div
      className={[
        styles.badge,
        styles.contestSize,
        styles[variantClass],
        className
      ].filter(Boolean).join(" ")}
    >
      <span className="flex flex-row">
        {Array(numTrophies).fill('').map((_, idx) => <TrophyIcon key={`trophy-${idx}`} />)}
      </span>
      {variant.replaceAll("_", " ")}
    </div>
  );
};

export default ContestSize;
