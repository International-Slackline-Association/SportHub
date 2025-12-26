import { cn } from '@utils/cn';
import styles from './styles.module.css';
import { PropsWithChildren } from 'react';
import { WarningTriangleIcon } from '@ui/Icons';

type ErrorMessageProps = PropsWithChildren<{
  className?: string;
  showIcon?: boolean;
  size?: "SM" | "MD" | "LG"
  variant?: "error" | "warning" | "info";
}>;

export const ErrorMessage = ({ className, children, showIcon = true, size="MD", variant="error" }: ErrorMessageProps) => {

  return (
    <div className={cn(
      styles.errorText,
      variant === "error" && styles.errorColor,
      variant === "warning" &&  styles.warningColor,
      variant === "info" &&  styles.infoColor,
      size === "MD" && styles.errorMedium,
      size === "SM" && styles.errorSmall,
      className,
    )}>
      {showIcon && <WarningTriangleIcon />}{children}
    </div>
  );
};