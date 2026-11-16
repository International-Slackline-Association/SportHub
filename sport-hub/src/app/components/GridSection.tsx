import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@utils/cn";

const colorStyles = {
  blue: {
    surface: "bg-blue-50 border-blue-200",
    hover: "hover:bg-blue-100",
    title: "text-blue-900",
  },
  amber: {
    surface: "bg-amber-50 border-amber-200",
    hover: "hover:bg-amber-100",
    title: "text-amber-900",
  },
  red: {
    surface: "bg-red-50 border-red-200",
    hover: "hover:bg-red-100",
    title: "text-red-900",
  },
  green: {
    surface: "bg-green-50 border-green-200",
    hover: "hover:bg-green-100",
    title: "text-green-900",
  },
  gray: {
    surface: "bg-gray-50 border-gray-200",
    hover: "hover:bg-gray-100",
    title: "text-gray-900",
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
      <div className="text-sm text-gray-700">{content}</div>
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
