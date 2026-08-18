import React from "react";
import styles from "./styles.module.css";
import Image from 'next/image';
import { pascalCaseToTitleCase } from ".";

interface GenderProps {
  variant: Gender | ContestGender;
  className?: string;
}

const genderLabels: Record<Gender | ContestGender, string> = {
  ALL: "MIXED",
  MEN: "MEN",
  MEN_ONLY: "MEN",
  MIXED: "MIXED",
  WOMEN: "WOMEN",
  WOMEN_ONLY: "WOMEN",
  OTHER: "OTHER",
};

const Gender = ({ variant, className = "" }: GenderProps) => {
  const variantClass = `gender${pascalCaseToTitleCase(variant)}`;

  const includeFemaleIcon = ["WOMEN", "WOMEN_ONLY", "MIXED", "ALL"].includes(variant);
  const includeMaleIcon = ["MEN", "MEN_ONLY", "MIXED", "ALL"].includes(variant);

  return (
    <div
      className={[
        styles.badge,
        styles.gender,
        styles[variantClass],
        className
      ].filter(Boolean).join(" ")}
    >
      {includeFemaleIcon && (
        <Image src="/static/images/icons/gender-female.svg" alt="Female" width={24} height={24} />
      )}
      {includeMaleIcon && (
        <Image src="/static/images/icons/gender-male.svg" alt="Male" width={24} height={24} />
      )}
      {genderLabels[variant]}
    </div>
  );
};

export default Gender;
