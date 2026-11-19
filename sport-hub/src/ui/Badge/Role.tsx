import { Badge, type BadgeCategoryColor } from "@slacklineinternational/onsight/react";
import Image from "next/image";

interface RoleProps {
  variant: Role;
  className?: string;
}

const roles: Record<Role, { label: string; color: BadgeCategoryColor; variant?: "soft" | "outline" }> = {
  ATHLETE: { label: "Athlete", color: "red" },
  JUDGE: { label: "Judge", color: "green" },
  ORGANIZER: { label: "Organizer", color: "neutral", variant: "outline" },
  ISA_VERIFIED: { label: "ISA Verified", color: "brand" },
};

const Role = ({ variant, className }: RoleProps) => {
  const role = roles[variant];

  return (
    <Badge color={role.color} variant={role.variant} className={className}>
      {variant === "ISA_VERIFIED" && (
        <Image src="/static/images/icons/check-circle.svg" alt="" width={12} height={12} />
      )}
      {role.label}
    </Badge>
  );
};

export default Role;
