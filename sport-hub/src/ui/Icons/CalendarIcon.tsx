import { cn } from '@utils/cn';

interface CalendarIconProps {
  size?: number;
  className?: string;
}

export const CalendarIcon = ({ size = 16, className }: CalendarIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <path
      d="M13 2H12V1H10V2H6V1H4V2H3C2.45 2 2 2.45 2 3V13C2 13.55 2.45 14 3 14H13C13.55 14 14 13.55 14 13V3C14 2.45 13.55 2 13 2ZM13 13H3V6H13V13ZM13 5H3V3H4V4H6V3H10V4H12V3H13V5Z"
      fill="currentColor"
    />
  </svg>
);
