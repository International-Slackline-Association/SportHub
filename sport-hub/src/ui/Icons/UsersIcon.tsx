import { cn } from '@utils/cn';

interface UsersIconProps {
  size?: number;
  className?: string;
}

export const UsersIcon = ({ size = 16, className }: UsersIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <path
      d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z"
      fill="currentColor"
    />
    <path
      d="M8 9C5.33 9 0 10.34 0 13V14H16V13C16 10.34 10.67 9 8 9Z"
      fill="currentColor"
    />
    <path
      d="M12.5 5.5C13.88 5.5 15 4.38 15 3C15 1.62 13.88 0.5 12.5 0.5C12.18 0.5 11.88 0.55 11.6 0.65C12.15 1.32 12.5 2.13 12.5 3C12.5 3.87 12.15 4.68 11.6 5.35C11.88 5.45 12.18 5.5 12.5 5.5Z"
      fill="currentColor"
      fillOpacity="0.5"
    />
    <path
      d="M16 10.5C16 9.12 14.34 8.17 12.5 7.58C14.25 8.33 15.5 9.36 15.5 10.5V11H16V10.5Z"
      fill="currentColor"
      fillOpacity="0.5"
    />
  </svg>
);
