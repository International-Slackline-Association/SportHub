import { cn } from '@utils/cn';
import styles from './styles.module.css';
import { PropsWithChildren } from 'react';
import { WarningTriangleIcon } from '@ui/Icons';

export type AlertProps = PropsWithChildren<{
  className?: string;
  showIcon?: boolean;
  size?: "SM" | "MD" | "LG"
  variant?: "error" | "warning" | "info" | "success";
}>;

export const Alert = ({ className, children, showIcon = true, size="MD", variant="error" }: AlertProps) => {

  return (
    <div className={cn(
      styles.errorText,
      variant === "error" && styles.errorColor,
      variant === "warning" &&  styles.warningColor,
      variant === "info" &&  styles.infoColor,
      variant === "success" &&  styles.successColor,
      size === "MD" && styles.errorMedium,
      size === "SM" && styles.errorSmall,
      className,
    )}>
      {(showIcon && variant !== "success") && <WarningTriangleIcon />}{children}
    </div>
  );
};