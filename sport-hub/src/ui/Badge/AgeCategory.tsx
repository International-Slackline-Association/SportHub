import { Badge } from "@slacklineinternational/onsight/react";

interface AgeCategoryProps {
  variant: AgeCategory;
  className?: string;
}

const ageCategoryLabels: Record<AgeCategory, string> = {
  ALL: "All Ages",
  YOUTH: "Youth",
  SENIOR: "Senior",
};

const AgeCategory = ({ variant, className }: AgeCategoryProps) => (
  <Badge color="neutral" className={className}>
    {ageCategoryLabels[variant] ?? variant}
  </Badge>
);

export default AgeCategory;
