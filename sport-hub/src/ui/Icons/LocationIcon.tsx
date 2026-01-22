import { cn } from '@utils/cn';

interface LocationIconProps {
  size?: number;
  className?: string;
}

export const LocationIcon = ({ size = 16, className }: LocationIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <path
      d="M8 1.5C5.51675 1.5 3.5 3.51675 3.5 6C3.5 9.375 8 14.5 8 14.5C8 14.5 12.5 9.375 12.5 6C12.5 3.51675 10.4832 1.5 8 1.5ZM8 7.75C7.0335 7.75 6.25 6.9665 6.25 6C6.25 5.0335 7.0335 4.25 8 4.25C8.9665 4.25 9.75 5.0335 9.75 6C9.75 6.9665 8.9665 7.75 8 7.75Z"
      fill="currentColor"
    />
  </svg>
);
