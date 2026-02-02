import { cn } from '@utils/cn';

interface TrophyIconProps {
  size?: number;
  className?: string;
}

export const TrophyIcon = ({ size = 16, className }: TrophyIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    {/* Main trophy cup */}
    <path
      d="M5 2V1H11V2V7C11 8.1 10.1 9 9 9H7C5.9 9 5 8.1 5 7V2Z"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    {/* Left handle */}
    <path
      d="M5 3H3C2.4 3 2 3.4 2 4V5C2 5.6 2.4 6 3 6H5"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    {/* Right handle */}
    <path
      d="M11 3H13C13.6 3 14 3.4 14 4V5C14 5.6 13.6 6 13 6H11"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    {/* Trophy stem */}
    <path
      d="M8 9V11"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    {/* Trophy base */}
    <path
      d="M6 11H10V13H6V11Z"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    {/* Bottom plate */}
    <path
      d="M5 13H11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
