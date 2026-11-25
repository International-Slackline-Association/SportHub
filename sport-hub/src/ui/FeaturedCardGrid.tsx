import { Children, PropsWithChildren, ReactNode } from 'react';
import { cn } from '@utils/cn';
import styles from './featuredSections.module.css';

type FeaturedCardGridProps = PropsWithChildren<{
  /** Desktop column count. Mobile uses a horizontal snap scroll. */
  columns?: 3 | 5;
  /** Tailwind min-width class for each card in the mobile scroller. */
  itemMinWidth?: string;
}>;

/**
 * Featured card rows: scroll on phones, equal columns that fill isa-main from
 * sm up. One DOM tree — avoids duplicating children and fighting Tailwind hidden
 * with module CSS display:grid.
 */
export function FeaturedCardGrid({
  children,
  columns = 3,
  itemMinWidth = 'min-w-72',
}: FeaturedCardGridProps) {
  const items = Children.toArray(children);
  const desktopGrid = columns === 5 ? styles.gridFive : styles.gridThree;

  return (
    <div
      className={cn(
        'flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:overflow-visible sm:pb-0 sm:snap-none',
        desktopGrid,
      )}
    >
      {items.map((child, index) => (
        <Item key={childKey(child, index)} className={itemMinWidth}>
          {child}
        </Item>
      ))}
    </div>
  );
}

function Item({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className={cn(className, 'shrink-0 snap-start sm:min-w-0 sm:w-auto sm:shrink')}>
      {children}
    </div>
  );
}

function childKey(child: ReactNode, index: number): string | number {
  if (child !== null && typeof child === 'object' && 'key' in child && child.key != null) {
    return String(child.key);
  }
  return index;
}