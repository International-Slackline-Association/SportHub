import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@utils/cn";

const colorStyles = {
  blue: {
    surface: "bg-status-info-bg border-default",
    hover: "hover:bg-status-info-bg",
    title: "text-link",
  },
  amber: {
    surface: "bg-status-warning-bg border-strong",
    hover: "hover:bg-status-warning-bg",
    title: "text-status-warning-fg",
  },
  red: {
    surface: "bg-status-danger-bg border-danger",
    hover: "hover:bg-status-danger-bg",
    title: "text-danger",
  },
  green: {
    surface: "bg-status-success-bg border-default",
    hover: "hover:bg-status-success-bg",
    title: "text-success",
  },
  gray: {
    surface: "bg-subtle border-default",
    hover: "hover:bg-muted",
    title: "text-default",
  },
} as const;

export type GridSectionColor = keyof typeof colorStyles;

export function GridSection({
  color,
  title,
  content,
  href,
  className,
}: {
  color: GridSectionColor;
  title: string;
  content: ReactNode;
  href?: string;
  className?: string;
}) {
  const styles = colorStyles[color];
  const classes = cn(
    "block p-6 border rounded-lg transition-colors",
    styles.surface,
    href && styles.hover,
    className,
  );
  const body = (
    <>
      <h3 className={cn("text-lg font-semibold mb-2", styles.title)}>{title}</h3>
      <div className="text-sm text-default">{content}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}
