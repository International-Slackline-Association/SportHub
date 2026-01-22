import Link from 'next/link';
import React from "react";
import styles from "./styles.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "default" | "destructive-secondary" | "icon" | "tab";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
  as?: "button" | "link";
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  href?: string;
}

const Button = ({
  as="button",
  variant = "primary",
  children,
  className = "",
  href,
  ...props
}: ButtonProps) => {
  const classNameCombined = [
        className,
        styles.button,
        styles[variant],
      ].filter(Boolean).join(" ");

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
