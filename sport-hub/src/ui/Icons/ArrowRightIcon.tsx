import { cn } from '@utils/cn';

interface ArrowRightIconProps {
  size?: number;
  className?: string;
}

export const ArrowRightIcon = ({ size = 16, className }: ArrowRightIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <path
      d="M8.70711 2.29289C8.31658 1.90237 7.68342 1.90237 7.29289 2.29289C6.90237 2.68342 6.90237 3.31658 7.29289 3.70711L10.5858 7H2C1.44772 7 1 7.44772 1 8C1 8.55228 1.44772 9 2 9H10.5858L7.29289 12.2929C6.90237 12.6834 6.90237 13.3166 7.29289 13.7071C7.68342 14.0976 8.31658 14.0976 8.70711 13.7071L13.7071 8.70711C14.0976 8.31658 14.0976 7.68342 13.7071 7.29289L8.70711 2.29289Z"
      fill="currentColor"
    />
  </svg>
);
