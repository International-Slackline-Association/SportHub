import { Badge } from "@slacklineinternational/onsight/react";
import { normalizeGender } from "@utils/gender";
import { textToTitleCase } from "@utils/strings";
import { FemaleIcon, MaleIcon } from "@ui/Icons";

interface GenderProps {
  className?: string;
  color?: "gray" | "neutral";
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "normal" | "bold" | "outline";
  value: Gender | ContestGender | string | undefined;
}

const Gender = ({
  className,
  showIcon = true,
  variant = "normal",
  value,
}: GenderProps) => {
  const normalizedGender = normalizeGender(value) || "";
  const label = textToTitleCase(normalizedGender);
  if (!label) return null;

  const includeFemaleIcon = normalizedGender === "WOMEN" || normalizedGender === "MIXED";
  const includeMaleIcon = normalizedGender === "MEN" || normalizedGender === "MIXED";

  return (
    <Badge color="neutral" variant={variant === "normal" ? "soft" : "outline"} className={className}>
      {showIcon && (includeFemaleIcon || includeMaleIcon) && (
        <span aria-hidden="true" className="inline-flex">
          {includeFemaleIcon && <FemaleIcon />}
          {includeMaleIcon && <MaleIcon />}
        </span>
      )}
      {label}
    </Badge>
  );
};

export default Gender;
