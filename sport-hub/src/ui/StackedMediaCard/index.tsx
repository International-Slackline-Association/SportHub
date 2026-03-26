import React, { ReactNode } from 'react';
import styles from './styles.module.css';
import { cn } from '@utils/cn';

export interface StackedMediaCardProps {
  children: ReactNode;
  className?: string;
  desktopDirection?: 'horizontal' | 'vertical';
  hoverable?: boolean;
  href?: string;
  media: ReactNode;
  mobileDirection?: 'horizontal' | 'vertical';
  padding?: string | number;
  onClick?: () => void;
}

/**
 * StackedMediaCard - A responsive layout component that displays media and content
 * Mobile: Side-by-side (row) layout with media on left, content on right
 * Desktop: Stacked (column) layout with media on top, content below, centered
 */
export const StackedMediaCard = ({
  children,
  className,
  desktopDirection = 'vertical',
  hoverable,
  href,
  media,
  mobileDirection = 'horizontal',
  padding = 'p-4',
  onClick,
}: StackedMediaCardProps) => {
  const cardClassName = cn(
    styles.card,
    hoverable && styles.hoverable,
    styles[`desktop-${desktopDirection}`],
    styles[`mobile-${mobileDirection}`],
    padding,
    className
  );

  const content = (
    <>
      <div className={styles.media}>{media}</div>
      <div className={styles.content}>{children}</div>
    </>
  );

  if (href) {
    return (
      <a href={href} className={cardClassName}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={cardClassName}>
        {content}
      </button>
    );
  }

  return (
    <div className={cardClassName}>
      {content}
    </div>
  );
};

export default StackedMediaCard;