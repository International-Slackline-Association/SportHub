import Link from 'next/link';
import React from "react";
import styles from "./styles.module.css";
import { cn } from '@utils/cn';

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "default" | "destructive-secondary" | "icon" | "tab";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
  as?: "button" | "link";
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  href?: string;
  size?: "medium" | "small";
}

const Button = ({
  as="button",
  variant = "primary",
  children,
  className = "",
  href,
  size = "medium",
  ...props
}: ButtonProps) => {
  const classNameCombined = cn(
    className,
    styles.button,
    styles[variant],
    styles[size]
  );

  if (as === "link" && href) {
    return (
      <Link
        href={href}
        className={classNameCombined}
        role="button"
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <button className={classNameCombined} {...props}>
      {children}
    </button>
  );
};

export default Button;
