import { normalizeGender } from "@utils/gender";
import { textToTitleCase } from "@utils/strings";
import { FemaleIcon, MaleIcon } from "@ui/Icons";
import { cn } from "@utils/cn";

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
  value,
}: GenderProps) => {
  const normalizedGender = normalizeGender(value) || "";
  const label = textToTitleCase(normalizedGender);
  if (!label) return null;

  const includeFemaleIcon = normalizedGender === "WOMEN" || normalizedGender === "MIXED";
  const includeMaleIcon = normalizedGender === "MEN" || normalizedGender === "MIXED";

  return (
    <span className={cn("cluster items-center gap-2", className)}>
      {showIcon && (includeFemaleIcon || includeMaleIcon) && (
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          {includeFemaleIcon && <FemaleIcon />}
          {includeMaleIcon && <MaleIcon />}
        </span>
      )}
      {label}
    </span>
  );
};

export default Gender;
