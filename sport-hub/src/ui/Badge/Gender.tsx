import React from "react";
import styles from "./styles.module.css";
import Image from 'next/image';
import { pascalCaseToTitleCase } from ".";

interface GenderProps {
  variant: Gender;
  className?: string;
}

const genderLabels: Record<Gender, string> = {
  FEMALE: "FEMALE",
  MALE: "MALE",
  NON_BINARY: "NON_BINARY",
  OTHER: "OTHER"
};

const Gender = ({ variant, className = "" }: GenderProps) => {
  const variantClass = `gender${pascalCaseToTitleCase(variant)}`;

  return (
    <div
      className={[
        styles.badge,
        styles.gender,
        styles[variantClass],
        className
      ].filter(Boolean).join(" ")}
    >
      {variant === "FEMALE" && (
        <Image src="/static/images/icons/gender-female.svg" alt="Female" width={24} height={24} />
      )}
      {variant === "MALE" && (
        <Image src="/static/images/icons/gender-male.svg" alt="Male" width={24} height={24} />
      )}
      {genderLabels[variant]}
    </div>
  );
};

export default Gender;
