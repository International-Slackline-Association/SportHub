import React from "react";
import styles from "./styles.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "default" | "destructive-secondary";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

const Button = ({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) => {
  return (
    <button
      className={[
        styles.button,
        styles[variant],
        className
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
