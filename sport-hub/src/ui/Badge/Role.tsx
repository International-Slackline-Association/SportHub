import React from "react";
import styles from "./styles.module.css";
import Image from 'next/image';
import { pascalCaseToTitleCase } from ".";

interface RoleProps {
  variant: Role;
  className?: string;
}

const roleLabels: Record<Role, string> = {
  ATHLETE: "Athlete",
  JUDGE: "JUDGE",
  ISA_VERIFIED: "ISA Verified",
  ORGANIZER: "Organizer",
};

const Role = ({ variant, className = "" }: RoleProps) => {
  const variantClass = `role${pascalCaseToTitleCase(variant)}`;

  return (
    <div
      className={[
        styles.badge,
        styles[variantClass],
        className
      ].filter(Boolean).join(" ")}
    >
      {variant === "ISA_VERIFIED" && (
        <Image src="/static/images/icons/check-circle.svg" alt="Checkmark" width={12} height={12} />
      )}
      {roleLabels[variant]}
    </div>
  );
};

export default Role;
