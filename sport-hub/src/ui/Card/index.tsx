import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import styles from './styles.module.css';
import { cn } from '@utils/cn';

/**
 * Generic Card Component
 * Supports multiple layout configurations:
 * - Full vertical (image on top, content below)
 * - Horizontal 60/40 (60% image left, 40% content right)
 * - Content only (no image)
 * Mobile responsive with stacking behavior
 */

export type CardLayout = 'vertical' | 'horizontal' | 'content-only';
export type CardShadow = 'none' | 'subtle' | 'elevated';

export interface CardImageProps {
  src: string;
  alt: string;
  height?: number;
  placeholder?: ReactNode;
}

export interface CardContentProps {
  children: ReactNode;
}

export interface CardProps {
  children: ReactNode;
  image?: CardImageProps;
  href?: string;
  layout?: CardLayout;
  shadow?: CardShadow;
  className?: string;
}

export interface CardGridProps {
  children: ReactNode;
  columns?: number;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Card Component
 * Flexible card container supporting various layouts
 */
export const Card = ({
  children,
  image,
  href,
  layout = 'vertical',
  shadow = 'subtle',
  className,
}: CardProps) => {
  const cardClassName = cn(
    styles.card,
    styles[`layout${layout.charAt(0).toUpperCase() + layout.slice(1)}`],
    styles[`shadow${shadow.charAt(0).toUpperCase() + shadow.slice(1)}`],
    className
  );

  const cardContent = (
    <>
      {image && (
        <div className={styles.imageWrapper}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            className={styles.image}
          />
          {image.placeholder && (
            <div className={styles.imagePlaceholder}>{image.placeholder}</div>
          )}
        </div>
      )}
      <div className={styles.content}>{children}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div className={cardClassName}>
      {cardContent}
    </div>
  );
};

/**
 * CardGrid Component
 * Responsive grid layout for multiple cards
 */
export const CardGrid = ({
  children,
  columns = 2,
  gap = 'md',
  className,
}: CardGridProps) => {
  return (
    <div
      className={cn(
        styles.grid,
        styles[`cols${columns}`],
        styles[`gap${gap.charAt(0).toUpperCase() + gap.slice(1)}`],
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;
