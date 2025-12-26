'use client';

import React, { useState } from 'react';
import { cn } from '@utils/cn';
import styles from './styles.module.css';

export type SortableListProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  onReorder: (next: T[]) => void;
  className?: string;
  itemClassName?: string;
  handleAriaLabel?: string;
};

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const startIndex = from < 0 ? copy.length + from : from;
  if (startIndex >= 0 && startIndex < copy.length) {
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
  }
  return copy;
}

export default function SortableList<T>({
  items,
  getKey,
  renderItem,
  onReorder,
  className,
  itemClassName,
  handleAriaLabel = 'Drag to reorder',
}: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => () => {
    setDragIndex(index);
  };

  const handleDragEnter = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (index !== overIndex) setOverIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = () => {
    if (dragIndex == null || overIndex == null || dragIndex === overIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    onReorder(arrayMove(items, dragIndex, overIndex));
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <ol className={cn(styles.list, className)} onDragOver={handleDragOver}>
      {items.map((item, idx) => {
        const key = getKey(item);
        const isDragging = dragIndex === idx;
        const isOver = overIndex === idx && dragIndex !== null && dragIndex !== overIndex;

        return (
          <li
            key={key}
            className={cn(styles.item, itemClassName, isDragging && styles.dragging, isOver && styles.over)}
            draggable
            onDragStart={handleDragStart(idx)}
            onDragEnter={handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            aria-grabbed={isDragging}
            aria-dropeffect="move"
          >
            <button
              type="button"
              className={styles.handle}
              aria-label={handleAriaLabel}
              onMouseDown={(e) => e.currentTarget.parentElement?.setAttribute('draggable', 'true')}
            >
              ⋮⋮
            </button>
            <div className={styles.content}>
              {renderItem(item, idx, isDragging)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export { arrayMove };
